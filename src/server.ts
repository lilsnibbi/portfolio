import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import config from "../config";

const START_TIMESTAMP = Date.now().toString();
const templateFile = Bun.file("./public/index.html");

if (!(await templateFile.exists())) {
	throw new Error("Missing public/index.html");
}

const template = (await templateFile.text())
	.replace(
		"/public/styles/styles.css",
		`/public/styles/styles.css?v=${START_TIMESTAMP}`,
	)
	.replace(
		"/public/scripts/main.js",
		`/public/scripts/main.js?v=${START_TIMESTAMP}`,
	);

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#039;",
			})[character] ?? character,
	);

const externalLink = (url: string, label: string, className = "text-link") => `
	<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">
		<span>${escapeHtml(label)}</span><span aria-hidden="true">↗</span>
	</a>`;

function renderPage() {
	const socials = config.profile.socialLinks
		.map((social) => externalLink(social.url, social.platform, "social-link"))
		.join("");

	const facts = [
		["Based", config.profile.location],
		["Pronouns", config.profile.pronouns],
		["Age", config.profile.age],
	]
		.map(
			([label, value]) => `
				<div class="hero-fact">
					<span>${escapeHtml(label ?? "")}</span>
					<strong>${escapeHtml(value ?? "")}</strong>
				</div>`,
		)
		.join("");

	const aboutParagraphs = config.about.paragraphs
		.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
		.join("");

	const stats = config.about.stats
		.map(
			(stat, index) => `
				<article class="stat reveal">
					<span class="stat-index">0${index + 1}</span>
					<span>${escapeHtml(stat.label)}</span>
					<strong>${escapeHtml(stat.value)}</strong>
				</article>`,
		)
		.join("");

	const projects = config.projects.list
		.map((project, index) => {
			const links = [
				project.github ? externalLink(project.github, "Source") : "",
				project.demo ? externalLink(project.demo, "Visit") : "",
			]
				.filter(Boolean)
				.join("");

			return `
				<article class="project-row reveal">
					<div class="project-number">0${index + 1}</div>
					<div class="project-main">
						<div class="project-heading">
							<h3>${escapeHtml(project.title)}</h3>
							<span>${escapeHtml(project.year)}</span>
						</div>
						<p>${escapeHtml(project.description)}</p>
						<ul class="tag-list" aria-label="Technologies">
							${project.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
						</ul>
					</div>
					<div class="project-links">${links}</div>
				</article>`;
		})
		.join("");

	const discord = config.profile.socialLinks.find(
		(social) => social.platform === "Discord",
	)?.url;
	const github = config.profile.socialLinks.find(
		(social) => social.platform === "GitHub",
	)?.url;

	const app = `
		<a class="skip-link" href="#main">Skip to content</a>
		<header class="site-header">
			<a class="brand" href="#home" aria-label="Back to top">
				<span>${escapeHtml(config.profile.name)}</span>
			</a>
			<nav aria-label="Primary navigation">
				<a href="#about">About</a>
				<a href="#work">Work</a>
				<a href="#contact">Contact</a>
			</nav>
			<a class="header-cta" href="mailto:${escapeHtml(config.contact.email)}">Let's talk <span aria-hidden="true">↗</span></a>
		</header>

		<main id="main">
			<section class="hero" id="home">
				<div class="hero-topline">
					<div class="status"><span></span>${escapeHtml(config.profile.status)}</div>
				</div>
				<div class="hero-copy">
					<p class="eyebrow">Hello, I'm ${escapeHtml(config.profile.name)}.</p>
					<h1>I make software<br><em>make sense.</em></h1>
					<p class="hero-bio">${escapeHtml(config.profile.bio)}</p>
					<div class="hero-actions">
						<a class="primary-action" href="#work">View selected work <span aria-hidden="true">↓</span></a>
						${github ? externalLink(github, "GitHub", "secondary-action") : ""}
					</div>
				</div>
				<div class="rotating-role" aria-live="polite">
					<span>Currently</span><strong id="role-text">${escapeHtml(config.profile.roles[0] ?? config.profile.role)}</strong>
				</div>
				<div class="hero-facts">${facts}</div>
				<a class="scroll-cue" href="#about"><span>Scroll to explore</span><span class="scroll-arrow" aria-hidden="true">↓</span></a>
			</section>

			<section class="section about" id="about">
				<div class="section-heading reveal">
					<p class="section-label">01 / ${escapeHtml(config.about.sectionTag)}</p>
					<h2>${escapeHtml(config.about.title)}</h2>
				</div>
				<div class="about-grid">
					<p class="about-lead reveal">${escapeHtml(config.about.lead)}</p>
					<div class="about-copy reveal">${aboutParagraphs}</div>
				</div>
				<div class="stats-grid">${stats}</div>
			</section>

			<section class="section work" id="work">
				<div class="section-heading reveal">
					<p class="section-label">02 / ${escapeHtml(config.projects.sectionTag)}</p>
					<h2>${escapeHtml(config.projects.title)}</h2>
					<p>${escapeHtml(config.projects.subtitle)}</p>
				</div>
				<div class="project-list">${projects}</div>
			</section>

			<section class="contact" id="contact">
				<div class="contact-card reveal">
					<p class="section-label">03 / ${escapeHtml(config.contact.sectionTag)}</p>
					<h2>${escapeHtml(config.contact.title)}</h2>
					<p>${escapeHtml(config.contact.subtitle)}</p>
					<div class="contact-actions">
						<a class="primary-action" href="mailto:${escapeHtml(config.contact.email)}">${escapeHtml(config.contact.email)} <span aria-hidden="true">↗</span></a>
						${discord ? externalLink(discord, `${config.contact.discordTitle} — @${config.contact.discord}`, "secondary-action") : ""}
					</div>
					<span class="contact-note">${escapeHtml(config.contact.discordDesc)}</span>
				</div>
			</section>
		</main>

		<footer>
			<div><strong class="footer-brand-name">${escapeHtml(config.footer.logoText)}</strong></div>
			<div class="footer-socials">${socials}</div>
			<p>© ${new Date().getFullYear()} ${escapeHtml(config.footer.copyrightName)}. ${escapeHtml(config.footer.rightsText)}</p>
		</footer>`;

	const clientConfig = JSON.stringify({ roles: config.profile.roles }).replace(
		/</g,
		"\\u003c",
	);

	return template
		.replaceAll("%%SITE_TITLE%%", escapeHtml(config.site.title))
		.replaceAll("%%SITE_DESCRIPTION%%", escapeHtml(config.site.description))
		.replaceAll("%%SITE_URL%%", escapeHtml(config.site.url))
		.replace("%%APP%%", app)
		.replace('{"__SERVER_CONFIG__":true}', clientConfig);
}

const renderedHtml = renderPage();
const etag = Bun.hash(renderedHtml).toString(16);

function handlePage(request: Request) {
	if (request.headers.get("if-none-match") === `"${etag}"`) {
		return new Response(null, { status: 304 });
	}

	return new Response(renderedHtml, {
		headers: {
			"cache-control": "public, max-age=300, must-revalidate",
			"content-type": "text/html; charset=utf-8",
			etag: `"${etag}"`,
			"referrer-policy": "strict-origin-when-cross-origin",
			"x-content-type-options": "nosniff",
		},
	});
}

new Elysia()
	.use(cors())
	.get("/", ({ request }) => handlePage(request))
	.get("/index.html", ({ request }) => handlePage(request))
	.get("/favicon.ico", () => Bun.file("./public/img/favicon.ico"))
	.get("/.well-known/cf-2fa-verify.txt", () => Bun.env.CF_TEMP_TOKEN ?? "")
	.get("/api/config", () => config)
	.get("/public/*", async ({ params, set }) => {
		const asset = params["*"];
		if (asset.includes("..") || asset.includes("\\")) {
			set.status = 400;
			return "Invalid asset path";
		}

		const file = Bun.file(`./public/${asset}`);
		if (await file.exists()) return file;

		set.status = 404;
		return "Not found";
	})
	.listen(3000, () => console.log("Portfolio online at http://localhost:3000"));
