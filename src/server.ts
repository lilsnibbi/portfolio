const headers = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const { pathname } = url;

		console.log(`${req.method} ${pathname}`);

		// Handle CORS preflight request
		if (req.method === "OPTIONS") {
			return new Response(null, { headers, status: 204 });
		}

		switch (true) {
			case pathname === "/":
			case pathname === "/index.html": {
				return new Response(Bun.file("./public/index.html"), { headers });
			}

			case pathname === "/favicon.ico": {
				return new Response(Bun.file("./public/img/favicon.ico"), {
					headers: {
						...headers,
						"Content-Type": "image/x-icon"
					}
				});
			}

			case pathname === "/api/config": {
				try {
					let configObj: any = {};
					const configFile = Bun.file("./config.json");
					if (await configFile.exists()) {
						configObj = await configFile.json();
					}
					// Inject sitekey from environment to avoid static source exposure
					configObj.turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
					return new Response(JSON.stringify(configObj), {
						headers: {
							...headers,
							"Content-Type": "application/json"
						}
					});
				} catch (err) {
					console.error("Error serving config:", err);
					return new Response(JSON.stringify({ error: "Failed to load config" }), {
						status: 500,
						headers: { ...headers, "Content-Type": "application/json" }
					});
				}
			}

			case req.method === "POST" && pathname === "/api/send-message": {
				try {
					const body = await req.json();
					const { name, email, message, turnstileToken } = body;

					if (!name || !email || !message) {
						return new Response(JSON.stringify({ error: "Name, email, and message are required." }), {
							status: 400,
							headers: { ...headers, "Content-Type": "application/json" }
						});
					}

					// Cloudflare Turnstile verification
					const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
					console.log("Using Turnstile Secret Key:", turnstileSecret ? `"${turnstileSecret}"` : "undefined");
					if (turnstileSecret) {
						if (!turnstileToken) {
							return new Response(JSON.stringify({ error: "Captcha verification token is missing." }), {
								status: 400,
								headers: { ...headers, "Content-Type": "application/json" }
							});
						}

						const remoteip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || undefined;
						
						const formData = new URLSearchParams();
						formData.append("secret", turnstileSecret);
						formData.append("response", turnstileToken);
						if (remoteip) {
							formData.append("remoteip", remoteip);
						}

						const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
							method: "POST",
							headers: { "Content-Type": "application/x-www-form-urlencoded" },
							body: formData.toString()
						});

						const verifyResult: any = await verifyResponse.json();
						if (!verifyResult.success) {
							console.error("Cloudflare Turnstile verification failed:", verifyResult);
							return new Response(JSON.stringify({ error: "Captcha verification failed. Please try again." }), {
								status: 400,
								headers: { ...headers, "Content-Type": "application/json" }
							});
						}
					} else {
						console.warn("TURNSTILE_SECRET_KEY is not configured. Skipping captcha check.");
					}

					// Send message to Discord Webhook
					const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
					if (!webhookUrl) {
						console.error("DISCORD_WEBHOOK_URL is not set.");
						return new Response(JSON.stringify({ error: "Server contact system is currently unavailable." }), {
							status: 500,
							headers: { ...headers, "Content-Type": "application/json" }
						});
					}

					const discordPayload = {
						username: "Portfolio Webhook",
						avatar_url: "https://i.imgur.com/4M24hkG.png",
						embeds: [
							{
								title: "📥 New Portfolio Contact Message",
								color: 0x000000,
								fields: [
									{
										name: "👤 Name",
										value: `\`\`\`${name}\`\`\``,
										inline: true
									},
									{
										name: "✉️ Email",
										value: `\`\`\`${email}\`\`\``,
										inline: true
									},
									{
										name: "💬 Message",
										value: message
									}
								],
								timestamp: new Date().toISOString()
							}
						]
					};

					const discordResponse = await fetch(webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(discordPayload)
					});

					if (!discordResponse.ok) {
						const responseText = await discordResponse.text();
						console.error("Failed to post message to Discord webhook:", responseText);
						return new Response(JSON.stringify({ error: "Failed to send message via webhook." }), {
							status: 502,
							headers: { ...headers, "Content-Type": "application/json" }
						});
					}

					return new Response(JSON.stringify({ success: true, message: "Message sent successfully!" }), {
						status: 200,
						headers: { ...headers, "Content-Type": "application/json" }
					});
				} catch (err) {
					console.error("Error in /api/send-message:", err);
					return new Response(JSON.stringify({ error: "Internal server error." }), {
						status: 500,
						headers: { ...headers, "Content-Type": "application/json" }
					});
				}
			}

			case pathname.startsWith("/public/"): {
				const file = Bun.file(`.${pathname}`);

				if (await file.exists()) {
					return new Response(file, { headers });
				}
				return new Response(null, { status: 404 });
			}

			case pathname.startsWith("/chunk-"): {
				const file = Bun.file(`./public${pathname}`);

				if (await file.exists()) {
					return new Response(file, { headers });
				}

				return new Response(null, { status: 404 });
			}

			default: {
				return new Response(null, { status: 404 });
			}
		}
	},
});
console.log("Server online");