import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
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
	return { calls, handler: (r: Request) => handler(r, "127.0.0.1") };
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
	test("Elysia passes the unparsed request to the handler", async () => {
		const { handler } = harness();
		const app = new Elysia().post(
			"/api/contact",
			({ request }) => handler(request),
			{ parse: "none" },
		);
		expect((await app.handle(request())).status).toBe(200);
	});
});
