import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { jwt } from "@elysiajs/jwt";
import { type } from "arktype";

// 1. Define the message schema using ArkType
const SendMessageSchema = type({
	message: "string>=10",
});

// 2. Cooldown Tracking Per Discord User ID (Persisted in cooldowns.json)
const COOLDOWNS_FILE = "./cooldowns.json";
const MESSAGE_COOLDOWN = 60 * 60 * 1000; // 1 hour in ms
let lastMessageMap = new Map<string, number>();

// Load cooldowns on startup
try {
	const file = Bun.file(COOLDOWNS_FILE);
	if (await file.exists()) {
		const data = await file.json();
		lastMessageMap = new Map(Object.entries(data));
	}
} catch (err) {
	console.error("Error loading cooldowns file:", err);
}

// Function to save and clean up cooldowns
async function saveCooldowns() {
	try {
		const now = Date.now();
		// Clean up expired entries to keep the JSON small
		for (const [id, timestamp] of lastMessageMap.entries()) {
			if (now - timestamp >= MESSAGE_COOLDOWN) {
				lastMessageMap.delete(id);
			}
		}
		const data = Object.fromEntries(lastMessageMap);
		await Bun.write(COOLDOWNS_FILE, JSON.stringify(data, null, 2));
	} catch (err) {
		console.error("Error saving cooldowns file:", err);
	}
}

// 3. IP Rate Limiting Configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 5; // Max 5 requests per minute

function checkRateLimit(request: Request, set: any) {
	const ip =
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-forwarded-for") ||
		"127.0.0.1";

	const now = Date.now();
	const record = rateLimitMap.get(ip);

	if (record) {
		if (now > record.resetTime) {
			rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		} else if (record.count >= MAX_REQUESTS) {
			set.status = 429;
			set.headers["retry-after"] = Math.ceil(
				(record.resetTime - now) / 1000,
			).toString();
			return { error: "Too many requests. Please try again later." };
		} else {
			record.count++;
		}
	} else {
		rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
	}
}

const rateLimiterHook = ({ request, set }: any) => {
	return checkRateLimit(request, set);
};

const START_TIMESTAMP = Date.now().toString();

// 4. Create and start Elysia Application
new Elysia()
	.use(cors())
	.use(
		jwt({
			name: "jwt",
			secret:
				process.env.JWT_SECRET ||
				"fallback-secret-for-local-dev-at-least-32-chars",
		}),
	)
	.onError(({ code, error, set }) => {
		const err = error as any;
		console.warn("Error hook triggered:", { code, message: err.message });
		if (code === "VALIDATION") {
			set.status = 400;
			try {
				const parsed = JSON.parse(err.message);
				const userMessage =
					parsed.summary || parsed.message || "Invalid input.";
				return { error: `Validation failed: ${userMessage}` };
			} catch (e) {
				return { error: `Validation failed: ${err.message}` };
			}
		}
	})
	.get("/", async () => {
		const html = await Bun.file("./public/index.html").text();
		return new Response(
			html
				.replace(
					"/public/styles/styles.css",
					`/public/styles/styles.css?v=${START_TIMESTAMP}`,
				)
				.replace(
					"/public/scripts/main.js",
					`/public/scripts/main.js?v=${START_TIMESTAMP}`,
				),
			{
				headers: { "content-type": "text/html; charset=utf-8" },
			},
		);
	})
	.get("/index.html", async () => {
		const html = await Bun.file("./public/index.html").text();
		return new Response(
			html
				.replace(
					"/public/styles/styles.css",
					`/public/styles/styles.css?v=${START_TIMESTAMP}`,
				)
				.replace(
					"/public/scripts/main.js",
					`/public/scripts/main.js?v=${START_TIMESTAMP}`,
				),
			{
				headers: { "content-type": "text/html; charset=utf-8" },
			},
		);
	})
	.get("/favicon.ico", ({ set }) => {
		set.headers["content-type"] = "image/x-icon";
		return Bun.file("./public/img/favicon.ico");
	})
	.get(".well-known/cf-2fa-verify.txt", () => Bun.env.CF_TEMP_TOKEN)
	.get(
		"/api/config",
		async ({ set }) => {
			try {
				let configObj: any = {};
				const configFile = Bun.file("./config.json");
				if (await configFile.exists()) {
					configObj = await configFile.json();
				}
				configObj.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
				return configObj;
			} catch (err) {
				console.error("Error serving config:", err);
				set.status = 500;
				return { error: "Failed to load config" };
			}
		},
		{
			beforeHandle: rateLimiterHook,
		},
	)
	.get(
		"/api/auth/discord/login",
		({ redirect }) => {
			const clientId = process.env.DISCORD_CLIENT_ID;
			const redirectUri = process.env.DISCORD_REDIRECT_URI;

			if (!clientId || !redirectUri) {
				// Mock Login for local development
				return redirect("/api/auth/discord/callback?code=mock");
			}

			const discordLoginUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
				redirectUri,
			)}&scope=identify`;

			return redirect(discordLoginUrl);
		},
		{
			beforeHandle: rateLimiterHook,
		},
	)
	.get(
		"/api/auth/discord/callback",
		async ({ query, jwt, cookie, set, redirect }) => {
			try {
				const session = cookie.session!;
				const code = query.code;
				if (!code) {
					set.status = 400;
					return "Authorization code missing";
				}

				let userProfile: { id: string; username: string; avatar: string };

				const isMock =
					!process.env.DISCORD_CLIENT_ID ||
					!process.env.DISCORD_CLIENT_SECRET ||
					code === "mock";

				if (isMock) {
					userProfile = {
						id: "1234567890",
						username: "MockDeveloper",
						avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
					};
				} else {
					const clientId = process.env.DISCORD_CLIENT_ID || "";
					const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
					const redirectUri = process.env.DISCORD_REDIRECT_URI || "";

					const tokenResponse = await fetch(
						"https://discord.com/api/oauth2/token",
						{
							method: "POST",
							headers: { "Content-Type": "application/x-www-form-urlencoded" },
							body: new URLSearchParams({
								client_id: clientId,
								client_secret: clientSecret,
								grant_type: "authorization_code",
								code,
								redirect_uri: redirectUri,
							}).toString(),
						},
					);

					const tokenData: any = await tokenResponse.json();
					if (!tokenData.access_token) {
						console.error("Token exchange error:", tokenData);
						set.status = 400;
						return "Failed to exchange authorization code";
					}

					const userResponse = await fetch(
						"https://discord.com/api/users/@me",
						{
							headers: { Authorization: `Bearer ${tokenData.access_token}` },
						},
					);

					const user: any = await userResponse.json();
					if (!user.id) {
						set.status = 400;
						return "Failed to fetch Discord user profile";
					}

					const avatarUrl = user.avatar
						? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
						: `https://cdn.discordapp.com/embed/avatars/${
								(BigInt(user.id) >> 22n) % 6n
							}.png`;

					userProfile = {
						id: user.id,
						username: user.global_name || user.username,
						avatar: avatarUrl,
					};
				}

				// Sign user details into JWT
				const token = await jwt.sign(userProfile);

				// Store in secure HTTP-only cookie
				session.set({
					value: token,
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
					path: "/",
					maxAge: 7 * 24 * 60 * 60, // 7 days
					sameSite: "lax",
				});

				return redirect("/");
			} catch (err) {
				console.error("OAuth callback error:", err);
				set.status = 500;
				return "Internal server error during OAuth callback";
			}
		},
		{
			beforeHandle: rateLimiterHook,
		},
	)
	.get("/api/auth/logout", ({ cookie, redirect }) => {
		cookie.session!.remove();
		return redirect("/");
	})
	.get("/api/auth/me", async ({ jwt, cookie }) => {
		const session = cookie.session!;
		const token = session.value;
		if (typeof token !== "string") {
			return { authenticated: false };
		}
		const user = await jwt.verify(token);
		if (!user) {
			session.remove(); // Remove cookie if tampered with or expired
			return { authenticated: false };
		}
		return { authenticated: true, user };
	})
	.post(
		"/api/send-message",
		async ({ body, jwt, cookie, set }) => {
			try {
				const session = cookie.session!;
				const token = session.value;
				if (typeof token !== "string") {
					set.status = 401;
					return { error: "You must login with Discord first." };
				}

				// Extract user from verified session
				const user = (await jwt.verify(token)) as {
					id: string;
					username: string;
					avatar: string;
				};

				const now = Date.now();
				const lastSent = lastMessageMap.get(user.id);
				if (lastSent && now - lastSent < MESSAGE_COOLDOWN) {
					const timeLeft = Math.ceil(
						(MESSAGE_COOLDOWN - (now - lastSent)) / (60 * 1000),
					);
					set.status = 429;
					return {
						error: `You can only send one message per hour. Please try again in ${timeLeft} minutes.`,
					};
				}

				const { message } = body;

				// Send message to Discord Webhook
				const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
				if (!webhookUrl) {
					console.error("something isn't set right...");
					set.status = 500;
					return { error: "Server contact system is currently unavailable." };
				}

				const discordPayload = {
					username: `${user.username} (via Portfolio)`,
					avatar_url: user.avatar,
					embeds: [
						{
							title: "📥 New Contact Message",
							color: 0x5865f2,
							fields: [
								{
									name: "👤 User Info",
									value: `**Username:** ${user.username}\n**User ID:** \`${user.id}\``,
									inline: false,
								},
								{
									name: "💬 Message",
									value: message,
								},
							],
							timestamp: new Date().toISOString(),
						},
					],
				} as const;

				const discordResponse = await fetch(webhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(discordPayload),
				});

				if (!discordResponse.ok) {
					console.error(
						"Failed to post message to Discord webhook:",
						await discordResponse.text(),
					);
					set.status = 502;
					return { error: "Failed to send message via webhook." };
				}

				// Successful send: Record cooldown and persist
				lastMessageMap.set(user.id, now);
				await saveCooldowns();

				return { success: true, message: "Message sent successfully!" };
			} catch (err) {
				console.error("Error in /api/send-message:", err);
				set.status = 500;
				return { error: "Internal server error." };
			}
		},
		{
			body: SendMessageSchema,
			beforeHandle: [
				rateLimiterHook,
				async ({ jwt, cookie, set }: any) => {
					const session = cookie.session!;
					const token = session.value;
					if (typeof token !== "string") {
						set.status = 401;
						return { error: "You must login with Discord first." };
					}

					const decoded = await jwt.verify(token);
					if (!decoded) {
						session.remove(); // Clear cookie if invalid or tampered with
						set.status = 401;
						return { error: "Session invalid or expired. Please login again." };
					}
				},
			],
		},
	)
	.get("/public/*", async ({ params, set }) => {
		const asset = params["*"];

		// Traversal protection
		if (asset.includes("..") || asset.includes("\\")) {
			set.status = 400;
			return "Invalid asset path";
		}

		const file = Bun.file(`./public/${asset}`);
		if (await file.exists()) {
			return file;
		}
		set.status = 404;
		return "Not Found";
	})
	.listen(3000, () => console.log("Server online"));
