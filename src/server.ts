import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const START_TIMESTAMP = Date.now().toString();

// Load static assets/configs on startup
let template = "";
let config: any = {};

try {
	const file = Bun.file("./public/index.html");
	if (await file.exists()) {
		template = await file.text();
		// replace stylesheet/script versions
		template = template
			.replace(
				"/public/styles/styles.css",
				`/public/styles/styles.css?v=${START_TIMESTAMP}`,
			)
			.replace(
				"/public/scripts/main.js",
				`/public/scripts/main.js?v=${START_TIMESTAMP}`,
			);
	}
} catch (err) {
	console.error("Error loading index template:", err);
}

try {
	const file = Bun.file("./config.json");
	if (await file.exists()) {
		config = await file.json();
	}
} catch (err) {
	console.error("Error loading config.json:", err);
}

function renderPage(config: any, template: string): string {
	const heroStatusStyle = config.profile.status
		? "display: inline-flex;"
		: "display: none;";
	const heroStatus = config.profile.status || "";
	const heroName = `Hi, I'm ${config.profile.name}`;
	const heroRole = config.profile.role || "";
	const heroBio = config.profile.bio || "";

	const heroLocationStyle = config.profile.location ? "" : "display: none;";
	const heroLocation = config.profile.location || "";
	const heroPronounsStyle = config.profile.pronouns
		? "display: flex;"
		: "display: none;";
	const heroPronouns = config.profile.pronouns || "";
	const heroAgeStyle = config.profile.age
		? "display: flex;"
		: "display: none;";
	const heroAge = config.profile.age || "";

	const followTitle = config.profile.socialsTitle || "";
	const heroSocials = config.profile.socialLinks
		.map(
			(social: any) =>
				`<li><a href="${social.url}" target="_blank" aria-label="${social.platform}"><i class="${social.icon}"></i></a></li>`,
		)
		.join("");

	const aboutSectionTag = config.about.sectionTag || "";
	const aboutTitle = config.about.title || "";
	const aboutParagraphs = config.about.paragraphs
		.map((p: string) => `<p>${p}</p>`)
		.join("");

	const aboutStats = config.about.stats
		.map(
			(stat: any) => `
			<div class="c1 reveal">
				<i class="${stat.icon}"></i>
				<h3>${stat.label}</h3>
				<p>${stat.value}</p>
			</div>
		`,
		)
		.join("");

	const projectSectionTag = config.projects.sectionTag || "";
	const projectTitle = config.projects.title || "";
	const projectSubtitle = config.projects.subtitle || "";
	const projectsGrid = config.projects.list
		.map((project: any) => {
			const githubBtn =
				project.github && project.github !== "#"
					? `<a href="${project.github}" class="btn" target="_blank"><i class="fab fa-github"></i> GitHub</a>`
					: "";
			const demoBtn =
				project.demo && project.demo !== "#"
					? `<a href="${project.demo}" class="btn" target="_blank"><i class="fas fa-external-link-alt"></i> Live Demo</a>`
					: "";

			return `
			<div class="project-card reveal">
				<div class="project-content">
					<h3>${project.title}</h3>
					<p>${project.description}</p>
					<div class="skills">
						${project.tags.map((tag: string) => `<a href="#">${tag}</a>`).join("")}
					</div>
					<div class="btns">
						${githubBtn}
						${demoBtn}
					</div>
				</div>
			</div>
		`;
		})
		.join("");

	const contactSectionTag = config.contact.sectionTag || "";
	const contactTitle = config.contact.title || "";
	const contactSubtitle = config.contact.subtitle || "";

	let contactDetails = "";
	if (config.contact.email) {
		contactDetails += `
			<div class="contact-item">
				<i class="fa-solid fa-envelope"></i>
				<span>${config.contact.email}</span>
			</div>
		`;
	}
	if (config.contact.discord) {
		contactDetails += `
			<div class="contact-item">
				<i class="fa-brands fa-discord"></i>
				<span>${config.contact.discord}</span>
			</div>
		`;
	}

	const discordLinkObj = config.profile.socialLinks.find(
		(s: any) => s.platform === "Discord",
	);
	const discordInviteUrl = discordLinkObj
		? discordLinkObj.url
		: "https://discord.gg/snibbi";
	const discordCardTitle = config.contact.discordTitle || "My Discord Community";
	const discordCardDesc =
		config.contact.discordDesc ||
		"Join my server to connect, collaborate, or just hang out!";

	const footerName = config.footer.logoText || "";
	const footerCopy = `&copy; ${new Date().getFullYear()} ${config.footer.copyrightName}. ${config.footer.rightsText}`;
	const footerSocials = config.profile.socialLinks
		.map(
			(social: any) => `
			<a href="${social.url}" target="_blank" aria-label="${social.platform}"><i class="${social.icon}"></i></a>
		`,
		)
		.join("");

	const configObj = {
		...config,
		turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
	};
	const configJson = JSON.stringify(configObj);

	return template
		.replace("%%HERO_STATUS_STYLE%%", heroStatusStyle)
		.replace("%%HERO_STATUS%%", heroStatus)
		.replace("%%HERO_NAME%%", heroName)
		.replace("%%HERO_ROLE%%", heroRole)
		.replace("%%HERO_BIO%%", heroBio)
		.replace("%%HERO_LOCATION_STYLE%%", heroLocationStyle)
		.replace("%%HERO_LOCATION%%", heroLocation)
		.replace("%%HERO_PRONOUNS_STYLE%%", heroPronounsStyle)
		.replace("%%HERO_PRONOUNS%%", heroPronouns)
		.replace("%%HERO_AGE_STYLE%%", heroAgeStyle)
		.replace("%%HERO_AGE%%", heroAge)
		.replace("%%FOLLOW_TITLE%%", followTitle)
		.replace("%%HERO_SOCIALS%%", heroSocials)
		.replace("%%ABOUT_SECTION_TAG%%", aboutSectionTag)
		.replace("%%ABOUT_TITLE%%", aboutTitle)
		.replace("%%ABOUT_PARAGRAPHS%%", aboutParagraphs)
		.replace("%%ABOUT_STATS%%", aboutStats)
		.replace("%%PROJECT_SECTION_TAG%%", projectSectionTag)
		.replace("%%PROJECT_TITLE%%", projectTitle)
		.replace("%%PROJECT_SUBTITLE%%", projectSubtitle)
		.replace("%%PROJECTS_GRID%%", projectsGrid)
		.replace("%%CONTACT_SECTION_TAG%%", contactSectionTag)
		.replace("%%CONTACT_TITLE%%", contactTitle)
		.replace("%%CONTACT_SUBTITLE%%", contactSubtitle)
		.replace("%%CONTACT_DETAILS%%", contactDetails)
		.replace("%%DISCORD_CARD_TITLE%%", discordCardTitle)
		.replace("%%DISCORD_CARD_DESC%%", discordCardDesc)
		.replace("%%DISCORD_INVITE_URL%%", discordInviteUrl)
		.replace("%%FOOTER_NAME%%", footerName)
		.replace("%%FOOTER_SOCIALS%%", footerSocials)
		.replace("%%FOOTER_COPY%%", footerCopy)
		.replace("%%CONFIG_JSON%%", configJson);
}

async function handleSsrRequest({ request, set }: { request: Request; set: any }) {
	const renderedHtml = renderPage(config, template);
	const etag = Bun.hash(renderedHtml).toString(16);

	const requestEtag = request.headers.get("if-none-match");
	if (requestEtag === `W/"${etag}"` || requestEtag === `"${etag}"`) {
		set.status = 304;
		return;
	}

	set.headers["etag"] = `"${etag}"`;
	set.headers["cache-control"] = "public, max-age=300, must-revalidate"; // Cache for 5 minutes, client must revalidate after
	set.headers["content-type"] = "text/html; charset=utf-8";
	return renderedHtml;
}

// 4. Create and start Elysia Application
new Elysia()
	.use(cors())
	.get("/", handleSsrRequest)
	.get("/index.html", handleSsrRequest)
	.get("/favicon.ico", ({ set }) => {
		set.headers["content-type"] = "image/x-icon";
		return Bun.file("./public/img/favicon.ico");
	})
	.get(".well-known/cf-2fa-verify.txt", () => Bun.env.CF_TEMP_TOKEN)
	.get("/api/config", async ({ set }) => {
		try {
			const configObj = {
				...config,
				turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || "",
			};
			return configObj;
		} catch (err) {
			console.error("Error serving config:", err);
			set.status = 500;
			return { error: "Failed to load config" };
		}
	})
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
