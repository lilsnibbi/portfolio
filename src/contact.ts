import { createHash } from "node:crypto";
import { BlockList, isIP } from "node:net";
import { RedisClient } from "bun";

export interface ContactSettings {
	secret: string;
	webhook: string;
	origins: string[];
	railway: boolean;
}

export type Limit = { key: string; maximum: number; seconds: number };
export type Limiter = (limits: Limit[]) => Promise<number>;

// Official ranges: https://www.cloudflare.com/ips/ (checked September 2026).
// Trust CF-Connecting-IP only when Railway identifies Cloudflare as its peer.
const cloudflare = new BlockList();
for (const cidr of [
	"173.245.48.0/20",
	"103.21.244.0/22",
	"103.22.200.0/22",
	"103.31.4.0/22",
	"141.101.64.0/18",
	"108.162.192.0/18",
	"190.93.240.0/20",
	"188.114.96.0/20",
	"197.234.240.0/22",
	"198.41.128.0/17",
	"162.158.0.0/15",
	"104.16.0.0/13",
	"104.24.0.0/14",
	"172.64.0.0/13",
	"131.0.72.0/22",
	"2400:cb00::/32",
	"2606:4700::/32",
	"2803:f800::/32",
	"2405:b500::/32",
	"2405:8100::/32",
	"2a06:98c0::/29",
	"2c0f:f248::/32",
]) {
	const [ip, prefix] = cidr.split("/");
	if (ip)
		cloudflare.addSubnet(ip, Number(prefix), isIP(ip) === 6 ? "ipv6" : "ipv4");
}

export function clientIp(request: Request, peerIp: string, railway: boolean) {
	let ip = railway ? (request.headers.get("x-real-ip") ?? "") : peerIp;
	const version = isIP(ip);
	if (
		railway &&
		version &&
		cloudflare.check(ip, version === 6 ? "ipv6" : "ipv4")
	)
		ip = request.headers.get("cf-connecting-ip") ?? ip;
	if (!isIP(ip)) return "";
	// URL parsing canonicalizes equivalent IPv6 spellings.
	return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname.slice(1, -1) : ip;
}

// Check and consume all buckets atomically, across replicas and restarts.
export const LIMIT_SCRIPT = `
local retry = 0
for i, key in ipairs(KEYS) do
  if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[i * 2 - 1]) then
    retry = math.max(retry, redis.call('TTL', key), 1)
  end
end
if retry > 0 then return retry end
for i, key in ipairs(KEYS) do
  if redis.call('INCR', key) == 1 then
    redis.call('EXPIRE', key, ARGV[i * 2])
  end
end
return 0`;

export function redisLimiter(url: string): Limiter {
	const redis = new RedisClient(url, {
		autoReconnect: true,
		enableOfflineQueue: false,
		connectionTimeout: 3000,
	});
	let connecting: Promise<void> | undefined;
	return async (limits) => {
		let timer: ReturnType<typeof setTimeout> | undefined;
		try {
			const retry = Number(
				await Promise.race([
					(async () => {
						if (!redis.connected) {
							connecting ??= redis.connect().finally(() => {
								connecting = undefined;
							});
							await connecting;
						}
						return redis.send("EVAL", [
							LIMIT_SCRIPT,
							String(limits.length),
							...limits.map((limit) => `portfolio:contact:v1:${limit.key}`),
							...limits.flatMap((limit) => [
								String(limit.maximum),
								String(limit.seconds),
							]),
						]);
					})(),
					new Promise<never>((_, reject) => {
						timer = setTimeout(
							() => reject(new Error("Rate limiter unavailable")),
							3000,
						);
					}),
				]),
			);
			if (!Number.isSafeInteger(retry) || retry < 0)
				throw new Error("Invalid rate limit response");
			return retry;
		} finally {
			clearTimeout(timer);
		}
	};
}

const hash = (value: string) =>
	createHash("sha256").update(value).digest("hex");
const reply = (status: number, message: string, retry?: number) =>
	Response.json(
		{ ok: status === 200, message },
		{
			status,
			headers: {
				"cache-control": "no-store",
				...(retry ? { "retry-after": String(retry) } : {}),
			},
		},
	);

export function createContactHandler(
	settings: ContactSettings,
	limit: Limiter,
	fetcher: typeof fetch = fetch,
) {
	const origins = new Set(settings.origins);
	const hosts = new Set(
		settings.origins.map((origin) => new URL(origin).hostname),
	);
	return async (request: Request, peerIp: string) => {
		if (!settings.secret || !settings.webhook || !origins.size) {
			return reply(
				503,
				"Messaging is temporarily unavailable. Please try Discord.",
			);
		}
		if (!origins.has(request.headers.get("origin") ?? ""))
			return reply(403, "Please send your message from this website.");
		if (
			request.headers.get("content-type")?.split(";")[0]?.trim() !==
			"application/json"
		)
			return reply(415, "Expected a JSON message.");
		if (Number(request.headers.get("content-length")) > 16384)
			return reply(413, "Your message is too long.");
		const ip = clientIp(request, peerIp, settings.railway);
		if (!isIP(ip)) return reply(403, "Unable to verify your connection.");
		try {
			const retry = await limit([
				{ key: `attempt:${hash(ip)}`, maximum: 10, seconds: 600 },
				{ key: "attempt:global", maximum: 120, seconds: 60 },
			]);
			if (retry)
				return reply(429, "Too many attempts. Please try again later.", retry);
		} catch {
			return reply(
				503,
				"Messaging is temporarily unavailable. Please try again later.",
			);
		}

		let body: Record<string, unknown>;
		try {
			const reader = request.body?.getReader();
			if (!reader) return reply(400, "Please fill out all three fields.");
			const chunks: Uint8Array[] = [];
			let size = 0;
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					size += value.byteLength;
					if (size > 16384) {
						await reader.cancel();
						return reply(413, "Your message is too long.");
					}
					chunks.push(value);
				}
			} finally {
				reader.releaseLock();
			}
			body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
			if (!body || typeof body !== "object" || Array.isArray(body))
				throw new Error("Invalid body");
		} catch {
			return reply(400, "Please check your message and try again.");
		}
		const { name, email, message, token } = body;
		if (
			typeof name !== "string" ||
			!name.trim() ||
			name.length > 80 ||
			Array.from(name).some((character) => character.charCodeAt(0) < 32) ||
			typeof email !== "string" ||
			email.length > 254 ||
			!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
			typeof message !== "string" ||
			!message.trim() ||
			message.length > 3000
		)
			return reply(
				400,
				"Please enter a name, valid email, and message (up to 3,000 characters).",
			);
		if (typeof token !== "string" || !token || token.length > 2048)
			return reply(403, "Please complete the verification and try again.");
		try {
			const response = await fetcher(
				"https://challenges.cloudflare.com/turnstile/v0/siteverify",
				{
					method: "POST",
					signal: AbortSignal.timeout(10000),
					body: new URLSearchParams({
						secret: settings.secret,
						response: token,
					}),
				},
			);
			const result = (await response.json()) as {
				success?: boolean;
				action?: string;
				hostname?: string;
			};
			if (
				!response.ok ||
				result.success !== true ||
				result.action !== "contact" ||
				!hosts.has(result.hostname ?? "")
			)
				return reply(403, "Verification expired or failed. Please try again.");
		} catch {
			return reply(
				503,
				"Verification is temporarily unavailable. Please try again.",
			);
		}
		try {
			const retry = await limit([
				{ key: `send:ip:${hash(ip)}`, maximum: 3, seconds: 3600 },
				{
					key: `send:email:${hash(email.toLowerCase())}`,
					maximum: 3,
					seconds: 3600,
				},
				{ key: "send:global", maximum: 20, seconds: 3600 },
			]);
			if (retry)
				return reply(
					429,
					"Message limit reached. Please try again later.",
					retry,
				);
		} catch {
			return reply(
				503,
				"Messaging is temporarily unavailable. Please try again later.",
			);
		}
		try {
			const url = new URL(settings.webhook);
			if (
				url.protocol !== "https:" ||
				url.hostname !== "discord.com" ||
				!/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname)
			)
				throw new Error("Invalid webhook configuration");
			url.searchParams.set("wait", "true");
			const response = await fetcher(url, {
				method: "POST",
				signal: AbortSignal.timeout(10000),
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					allowed_mentions: { parse: [] },
					embeds: [
						{
							title: "New portfolio message",
							fields: [
								{ name: "Name", value: name.trim() },
								{ name: "Email", value: email },
							],
							description: message.trim(),
							timestamp: new Date().toISOString(),
						},
					],
				}),
			});
			if (!response.ok)
				return reply(
					502,
					"Your message could not be delivered. Please try Discord or try again later.",
				);
		} catch {
			return reply(
				502,
				"Delivery could not be confirmed. Please try Discord or try again later.",
			);
		}
		return reply(200, "Message sent. Thanks for reaching out!");
	};
}
