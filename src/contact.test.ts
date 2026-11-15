import { describe, expect, test } from "bun:test";
import { clientIp, createContactHandler, type Limiter } from "./contact";

const settings = {
	secret: "test-secret",
	webhook: "https://discord.com/api/webhooks/123/test-token",
	origins: ["https://lilsnibbi.dev"],
	railway: false,
};
const valid = {
	name: "Test visitor",
	email: "visitor@example.com",
	message: "Hello @everyone",
	token: "fresh-token",
};
const request = (body: unknown = valid, headers: Record<string, string> = {}) =>
	new Request("https://lilsnibbi.dev/api/contact", {
		method: "POST",
		headers: {
			origin: "https://lilsnibbi.dev",
			"content-type": "application/json",
			...headers,
		},
		body: JSON.stringify(body),
	});
function harness(
	options: {
		result?: unknown;
		limit?: Limiter;
		fail?: boolean;
		discordStatus?: number;
		railway?: boolean;
	} = {},
) {
	const calls: { url: string; body: string }[] = [];
	const handler = createContactHandler(
		{ ...settings, railway: options.railway ?? false },
		options.limit ?? (async () => 0),
		(async (input, init) => {
			calls.push({ url: String(input), body: String(init?.body) });
			if (options.fail) throw new Error("Network unavailable");
			return String(input).includes("siteverify")
				? Response.json(
						options.result ?? {
							success: true,
							action: "contact",
							hostname: "lilsnibbi.dev",
						},
					)
				: Response.json({}, { status: options.discordStatus ?? 200 });
		}) as typeof fetch,
	);
	return {
		calls,
		handler: (r: Request, peerIp = "127.0.0.1") => handler(r, peerIp),
	};
}

// Stateful test double for Redis's atomic, expiring buckets.
function countingLimiter(now: () => number = Date.now): Limiter {
	const buckets = new Map<string, { count: number; expires: number }>();
	return async (limits) => {
		const time = now();
		let retry = 0;
		for (const limit of limits) {
			const bucket = buckets.get(limit.key);
			if (bucket && bucket.expires > time && bucket.count >= limit.maximum)
				retry = Math.max(retry, Math.ceil((bucket.expires - time) / 1000));
		}
		if (retry) return retry;
		for (const limit of limits) {
			const bucket = buckets.get(limit.key);
			buckets.set(
				limit.key,
				bucket && bucket.expires > time
					? { ...bucket, count: bucket.count + 1 }
					: { count: 1, expires: time + limit.seconds * 1000 },
			);
		}
		return 0;
	};
}

describe("contact security and delivery", () => {
	test("a reused token rejected by Siteverify cannot send a second message", async () => {
		const result = {
			success: true,
			action: "contact",
			hostname: "lilsnibbi.dev",
		};
		const { handler, calls } = harness({ result });
		expect((await handler(request())).status).toBe(200);
		result.success = false;
		expect((await handler(request())).status).toBe(403);
		expect(
			calls.filter((call) => call.url.includes("discord.com")),
		).toHaveLength(1);
	});
	test("Cloudflare visitor addresses require a trusted edge peer", () => {
		expect(
			clientIp(
				request(valid, {
					"x-real-ip": "104.16.0.1",
					"cf-connecting-ip": "192.0.2.4",
				}),
				"127.0.0.1",
				true,
			),
		).toBe("192.0.2.4");
		expect(
			clientIp(
				request(valid, {
					"x-real-ip": "192.0.2.1",
					"cf-connecting-ip": "192.0.2.4",
				}),
				"127.0.0.1",
				true,
			),
		).toBe("192.0.2.1");
	});
	test("valid request delivers once without mention pings or secrets in response", async () => {
		const { handler, calls } = harness();
		const response = await handler(request());
		expect(response.status).toBe(200);
		expect(calls).toHaveLength(2);
		expect(calls[1]?.url).toContain("wait=true");
		const payload = JSON.parse(calls[1]?.body ?? "{}");
		expect(payload.allowed_mentions).toEqual({ parse: [] });
		expect(payload.embeds[0].fields[1].value).toBe(valid.email);
		expect(await response.text()).not.toContain(settings.secret);
	});
	for (const result of [
		{ success: false },
		{ success: "true", action: "contact", hostname: "lilsnibbi.dev" },
		{ success: true, action: "login", hostname: "lilsnibbi.dev" },
		{ success: true, action: "contact", hostname: "localhost" },
		{ success: true, action: "contact", hostname: "evil.example" },
	]) {
		test(`rejects invalid Turnstile result ${JSON.stringify(result)}`, async () => {
			const { handler, calls } = harness({ result });
			expect((await handler(request())).status).toBe(403);
			expect(calls).toHaveLength(1);
		});
	}
	test("missing and oversized tokens never contact Discord", async () => {
		const { handler, calls } = harness();
		for (const token of ["", undefined, "a".repeat(2049)])
			expect((await handler(request({ ...valid, token }))).status).toBe(403);
		expect(calls).toHaveLength(0);
	});
	test("missing and foreign origins are denied", async () => {
		const { handler, calls } = harness();
		for (const origin of ["", "https://evil.example"])
			expect((await handler(request(valid, { origin }))).status).toBe(403);
		expect(calls).toHaveLength(0);
	});
	test("invalid fields and oversized bodies are rejected", async () => {
		const { handler, calls } = harness();
		for (const body of [
			null,
			[],
			{ ...valid, name: " " },
			{ ...valid, email: "invalid" },
			{ ...valid, message: "a".repeat(3001) },
		])
			expect((await handler(request(body))).status).toBe(400);
		expect(
			(await handler(request({ ...valid, message: "a".repeat(17000) }))).status,
		).toBe(413);
		expect(calls).toHaveLength(0);
	});
	test("attempt limits apply before external requests", async () => {
		const { handler, calls } = harness({ limit: async () => 42 });
		const response = await handler(request());
		expect(response.status).toBe(429);
		expect(response.headers.get("retry-after")).toBe("42");
		expect(calls).toHaveLength(0);
	});
	test("send limits block delivery after valid verification", async () => {
		const { handler, calls } = harness({
			limit: async (limits) => (limits[0]?.key.startsWith("send:") ? 3600 : 0),
		});
		expect((await handler(request())).status).toBe(429);
		expect(calls).toHaveLength(1);
	});
	test("send policy allows one message per IP and email every 30 minutes", async () => {
		const seen: Parameters<Limiter>[0][] = [];
		const { handler } = harness({
			limit: async (limits) => {
				seen.push(limits);
				return 0;
			},
		});
		expect((await handler(request())).status).toBe(200);
		expect(seen[1]).toEqual([
			{
				key: expect.stringMatching(/^send:ip:[a-f0-9]{64}$/),
				maximum: 1,
				seconds: 1800,
			},
			{
				key: expect.stringMatching(/^send:email:[a-f0-9]{64}$/),
				maximum: 1,
				seconds: 1800,
			},
			{ key: "send:global", maximum: 20, seconds: 3600 },
		]);
	});
	for (const bucket of ["IP", "email"]) {
		test(`${bucket} cooldown blocks repeat delivery until 30 minutes expire`, async () => {
			let time = 0;
			const { handler, calls } = harness({
				limit: countingLimiter(() => time),
			});
			expect((await handler(request())).status).toBe(200);
			const repeat = () =>
				handler(
					request({
						...valid,
						email:
							bucket === "IP"
								? "another@example.com"
								: valid.email.toUpperCase(),
						token: "another-fresh-token",
					}),
					bucket === "IP" ? "127.0.0.1" : "192.0.2.2",
				);
			const blocked = await repeat();
			expect(blocked.status).toBe(429);
			expect(blocked.headers.get("retry-after")).toBe("1800");
			time = 1_799_000;
			const almostExpired = await repeat();
			expect(almostExpired.status).toBe(429);
			expect(almostExpired.headers.get("retry-after")).toBe("1");
			expect(
				calls.filter((call) => call.url.includes("discord.com")),
			).toHaveLength(1);
			time = 1_800_000;
			expect((await repeat()).status).toBe(200);
			expect(
				calls.filter((call) => call.url.includes("discord.com")),
			).toHaveLength(2);
		});
	}
	test("concurrent verified submissions from one IP deliver only once", async () => {
		const { handler, calls } = harness({ limit: countingLimiter() });
		const responses = await Promise.all(
			Array.from({ length: 6 }, (_, index) =>
				handler(
					request({
						...valid,
						email: `visitor${index}@example.com`,
						token: `fresh-token-${index}`,
					}),
				),
			),
		);
		expect(
			responses.filter((response) => response.status === 200),
		).toHaveLength(1);
		expect(
			responses.filter((response) => response.status === 429),
		).toHaveLength(5);
		expect(
			calls.filter((call) => call.url.includes("discord.com")),
		).toHaveLength(1);
	});
	test("direct API requests with forged tokens are attempt-limited and never delivered", async () => {
		const { handler, calls } = harness({
			result: { success: false },
			limit: countingLimiter(),
		});
		for (let attempt = 0; attempt < 10; attempt++)
			expect(
				(await handler(request({ ...valid, token: "forged-token" }))).status,
			).toBe(403);
		const blocked = await handler(request({ ...valid, token: "forged-token" }));
		expect(blocked.status).toBe(429);
		expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
		expect(calls).toHaveLength(10);
		expect(calls.every((call) => call.url.includes("siteverify"))).toBe(true);
	});
	test("Redis failures fail closed", async () => {
		const { handler, calls } = harness({
			limit: async () => {
				throw new Error("Redis down");
			},
		});
		expect((await handler(request())).status).toBe(503);
		expect(calls).toHaveLength(0);
	});
	test("Turnstile network failures fail closed", async () => {
		const { handler, calls } = harness({ fail: true });
		expect((await handler(request())).status).toBe(503);
		expect(calls).toHaveLength(1);
	});
	test("Discord failures never claim delivery", async () => {
		const { handler } = harness({ discordStatus: 429 });
		expect((await handler(request())).status).toBe(502);
	});
	test("forged forwarding headers do not select the rate bucket", async () => {
		const buckets: string[] = [];
		const { handler } = harness({
			railway: true,
			limit: async (limits) => {
				buckets.push(limits[0]?.key ?? "");
				return 42;
			},
		});
		await handler(
			request(valid, {
				"x-real-ip": "192.0.2.1",
				"x-forwarded-for": "1.1.1.1",
				"cf-connecting-ip": "1.1.1.1",
			}),
		);
		await handler(
			request(valid, {
				"x-real-ip": "192.0.2.1",
				"x-forwarded-for": "8.8.8.8",
				"cf-connecting-ip": "8.8.8.8",
			}),
		);
		expect(buckets[0]).toBe(buckets[1]);
	});
	test("Bun passes the unparsed HTTP request to the handler", async () => {
		const { handler, calls } = harness();
		let bodyUsed: boolean | undefined;
		const server = Bun.serve({
			hostname: "127.0.0.1",
			port: 0,
			fetch(incoming) {
				bodyUsed = incoming.bodyUsed;
				return handler(incoming);
			},
		});
		try {
			const outgoing = request();
			const response = await fetch(new URL("/api/contact", server.url), {
				method: outgoing.method,
				headers: outgoing.headers,
				body: await outgoing.text(),
			});
			expect(response.status).toBe(200);
			expect(bodyUsed).toBe(false);
			expect(await response.json()).toMatchObject({ ok: true });
			expect(calls).toHaveLength(2);
		} finally {
			await server.stop(true);
		}
	});
});
