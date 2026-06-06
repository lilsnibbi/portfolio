import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

new Elysia()
	.use(cors())
	.get("/", () => Bun.file("./public/index.html"))
	.get("/index.html", () => Bun.file("./public/index.html"))
	.get("/favicon.ico", ({ set }) => {
		set.headers["content-type"] = "image/x-icon";
		return Bun.file("./public/img/favicon.ico");
	})
	.get("/api/config", async ({ set }) => {
		try {
			let configObj: any = {};
			const configFile = Bun.file("./config.json");
			if (await configFile.exists()) {
				configObj = await configFile.json();
			}
			// Inject sitekey from environment to avoid static source exposure
			configObj.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
			return configObj;
		} catch (err) {
			console.error("Error serving config:", err);
			set.status = 500;
			return { error: "Failed to load config" };
		}
	})
	.post("/api/send-message", async ({ body, request, set }) => {
		try {
			const { name, email, message, turnstileToken } = body as {
				name?: string;
				email?: string;
				message?: string;
				turnstileToken?: string;
			};

			if (!name || !email || !message) {
				set.status = 400;
				return { error: "Name, email, and message are required." };
			}

			// Cloudflare Turnstile verification
			const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
			console.log(
				"Using Turnstile Secret Key:",
				turnstileSecret ? `"${turnstileSecret}"` : "undefined",
			);
			if (turnstileSecret) {
				if (!turnstileToken) {
					set.status = 400;
					return { error: "Captcha verification token is missing." };
				}

				const remoteip =
					request.headers.get("cf-connecting-ip") ||
					request.headers.get("x-forwarded-for") ||
					undefined;

				const formData = new URLSearchParams();
				formData.append("secret", turnstileSecret);
				formData.append("response", turnstileToken);
				if (remoteip) {
					formData.append("remoteip", remoteip);
				}

				const verifyResponse = await fetch(
					"https://challenges.cloudflare.com/turnstile/v0/siteverify",
					{
						method: "POST",
						headers: { "Content-Type": "application/x-www-form-urlencoded" },
						body: formData.toString(),
					},
				);

				const verifyResult: any = await verifyResponse.json();
				if (!verifyResult.success) {
					console.error(
						"Cloudflare Turnstile verification failed:",
						verifyResult,
					);
					set.status = 400;
					return { error: "Captcha verification failed. Please try again." };
				}
			} else {
				console.warn(
					"Skipping captcha check.",
				);
			}

			// Send message to Discord Webhook
			const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
			if (!webhookUrl) {
				console.error("something isn't set right...");
				set.status = 500;
				return { error: "Server contact system is currently unavailable." };
			}

			const discordPayload = {
				embeds: [
					{
						title: "📥 New Portfolio Contact Message",
						color: 0x000000,
						fields: [
							{
								name: "👤 Name",
								value: `\`\`\`${name}\`\`\``,
								inline: true,
							},
							{
								name: "✉️ Email",
								value: `\`\`\`${email}\`\`\``,
								inline: true,
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
				const responseText = await discordResponse.text();
				console.error(
					"Failed to post message to Discord webhook:",
					responseText,
				);
				set.status = 502;
				return { error: "Failed to send message via webhook." };
			}

			return { success: true, message: "Message sent successfully!" };
		} catch (err) {
			console.error("Error in /api/send-message:", err);
			set.status = 500;
			return { error: "Internal server error." };
		}
	})
	.get("/public/:asset", async ({ params, set }) => {
		const file = Bun.file(`./public/${params.asset}`);
		if (await file.exists()) {
			return file;
		}
		set.status = 404;
		return "Not Found";
	})
	.get("/:asset", async ({ params }) => {
		const asset = params.asset;
		if (!asset.startsWith("chunk-"))
			return new Response(null, {
				status: 404,
			});

		const file = Bun.file(`./public/chunk-${params.asset.split("-")[1]}`);
		if (await file.exists()) {
			return file;
		}

		return new Response(null, {
			status: 404,
		});
	})
	.listen(3000, () => console.log("Server online"));
