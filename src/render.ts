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
		<span>${escapeHtml(label)}</span><span class="link-arrow" aria-hidden="true">↗</span>
	</a>`;

const corners = `
	<span class="corner c-tl" aria-hidden="true"></span>
	<span class="corner c-tr" aria-hidden="true"></span>
	<span class="corner c-bl" aria-hidden="true"></span>
	<span class="corner c-br" aria-hidden="true"></span>`;

const pad = (value: number) => String(value).padStart(2, "0");

const sectionHead = (
	tag: string,
	title: string,
	index: number,
	total: number,
) => `
	<div class="sec-head">
		<span class="diamond" aria-hidden="true"></span>
		<p class="sec-tag">${escapeHtml(tag)}</p>
		<span class="sec-rule" aria-hidden="true"></span>
		<span class="sec-index" aria-hidden="true">File ${pad(index)} / ${pad(total)}</span>
	</div>
	<h2>${escapeHtml(title)}</h2>`;

export function renderPage() {
	const socials = config.profile.socialLinks
		.map((social) => externalLink(social.url, social.platform, "social-link"))
		.join("");

	const tickerItems = config.profile.roles
		.map(
			(role) =>
				`<span class="tick">${escapeHtml(role)}</span><span class="tick-sep" aria-hidden="true">◆</span>`,
		)
		.join("");

	const aboutParagraphs = config.about.paragraphs
		.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
		.join("");

	const statRows = config.about.stats
		.map(
			(stat) => `
				<div class="data-row">
					<dt>${escapeHtml(stat.label)}</dt>
					<dd>${escapeHtml(stat.value)}</dd>
				</div>`,
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
				<article class="card reveal">
					${corners}
					<span class="hatch-strip" aria-hidden="true"></span>
					<div class="card-head">
						<h3>${escapeHtml(project.title)}</h3>
						<span class="card-meta"><span class="card-id" aria-hidden="true">P-${pad(index + 1)}</span><span class="card-year">${escapeHtml(project.year)}</span></span>
					</div>
					<p class="card-desc">${escapeHtml(project.description)}</p>
					<ul class="tags" aria-label="Technologies">
						${project.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
					</ul>
					<div class="card-links">${links}</div>
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
		<header class="rail">
			<a class="brand" href="#home" aria-label="Back to top">S<span class="brand-dot">◆</span></a>
			<nav aria-label="Primary navigation">
				<a href="#about">About</a>
				<a href="#work">Work</a>
				<a href="#contact">Community</a>
			</nav>
			<span class="rail-status" title="${escapeHtml(config.profile.status)}" aria-hidden="true"></span>
		</header>

		<main id="main">
			<section class="hero" id="home">
				<div class="hero-frame">
					${corners}
					<span class="frame-ticks t-left" aria-hidden="true"></span>
					<span class="frame-ticks t-right" aria-hidden="true"></span>
					<span class="frame-label fl-top" aria-hidden="true">Dossier // ${new Date().getFullYear()}</span>
					<span class="frame-label fl-bottom" aria-hidden="true">${escapeHtml(config.site.url.replace(/^https?:\/\//, ""))}</span>
					<p class="eyebrow"><span aria-hidden="true">◆</span> ${escapeHtml(config.profile.role)}</p>
					<h1 class="hero-name glitch" data-text="${escapeHtml(config.profile.name.toUpperCase())}">${escapeHtml(config.profile.name)}</h1>
					<div class="role-ticker" aria-label="Roles">
						<div class="ticker-track">
							<span class="ticker-run">${tickerItems}</span>
							<span class="ticker-run" aria-hidden="true">${tickerItems}</span>
						</div>
					</div>
					<p class="hero-bio">${escapeHtml(config.profile.bio)}</p>
					<ul class="stat-chips" aria-label="Personal details">
						<li>${escapeHtml(config.profile.pronouns)}</li>
						<li>${escapeHtml(config.profile.age)}</li>
						<li>${escapeHtml(config.profile.location)}</li>
						<li class="chip-live"><span class="pulse-diamond" aria-hidden="true"></span>${escapeHtml(config.profile.status)}</li>
					</ul>
					<div class="hero-actions">
						<a class="btn btn-solid" href="#work">See the work <span aria-hidden="true">↓</span></a>
						${github ? externalLink(github, "GitHub", "btn btn-line") : ""}
					</div>
				</div>
			</section>

			<section class="section" id="about">
				${sectionHead(config.about.sectionTag, config.about.title, 1, 3)}
				<div class="about-grid">
					<div class="about-copy reveal">
						<p class="about-lead">${escapeHtml(config.about.lead)}</p>
						${aboutParagraphs}
					</div>
					<dl class="data-card reveal">
						<span class="data-hatch" aria-hidden="true"></span>
						<p class="data-title">Stats</p>
						${statRows}
					</dl>
				</div>
			</section>

			<section class="section" id="work">
				${sectionHead(config.projects.sectionTag, config.projects.title, 2, 3)}
				<p class="section-sub">${escapeHtml(config.projects.subtitle)}</p>
				<div class="cards">${projects}</div>
			</section>

			<section class="section" id="contact">
				${sectionHead(config.contact.sectionTag, config.contact.title, 3, 3)}
				<p class="section-sub">${escapeHtml(config.contact.subtitle)}</p>
				${
					discord
						? `<a class="banner reveal" href="${escapeHtml(discord)}" target="_blank" rel="noreferrer">
								${corners}
								<span class="banner-glyph" aria-hidden="true">
									<svg viewBox="0 0 24 18" width="34" height="26" fill="currentColor" aria-hidden="true"><path d="M20.32 1.51A19.8 19.8 0 0 0 15.43 0c-.23.4-.46.87-.63 1.3a18.4 18.4 0 0 0-5.6 0A12.8 12.8 0 0 0 8.56 0 19.7 19.7 0 0 0 3.67 1.52C.57 6.09-.27 10.55.15 14.95a19.9 19.9 0 0 0 6 3.05c.49-.66.92-1.36 1.29-2.1-.71-.26-1.38-.59-2.02-.97.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.17 0c.16.14.33.27.5.4-.64.38-1.32.71-2.03.98.37.73.8 1.43 1.3 2.09a19.8 19.8 0 0 0 6-3.05c.5-5.1-.84-9.53-3.54-13.44ZM8.02 12.25c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.4 0 1.33-.95 2.41-2.15 2.41Zm7.95 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.94-2.41 2.15-2.41 1.2 0 2.17 1.09 2.14 2.4 0 1.33-.94 2.41-2.14 2.41Z"/></svg>
								</span>
								<span class="banner-copy">
									<span class="banner-title">${escapeHtml(config.contact.discordTitle)}</span>
									<span class="banner-desc">${escapeHtml(config.contact.discordDesc)}</span>
									<span class="banner-meta">
										<span class="banner-members"><span class="pulse-diamond" aria-hidden="true"></span>${escapeHtml(config.contact.discordMembers)}</span>
										<span class="banner-invite">${escapeHtml(discord.replace(/^https?:\/\//, ""))}</span>
									</span>
								</span>
								<span class="btn btn-solid banner-cta">${escapeHtml(config.contact.discordCta)}<span class="link-arrow" aria-hidden="true">↗</span></span>
							</a>`
						: ""
				}
				<p class="dm-line reveal">Or DM me directly — <span class="dm-handle">@${escapeHtml(config.contact.discord)}</span> on Discord, or visit the community site at ${externalLink(config.contact.website, config.contact.website.replace(/^https?:\/\//, ""))}</p>
			</section>
		</main>

		<footer>
			<div class="footer-inner">
				<p>© ${new Date().getFullYear()} ${escapeHtml(config.footer.copyrightName)}. ${escapeHtml(config.footer.rightsText)}</p>
				<span class="eot" aria-hidden="true">◆ End of transmission ◆</span>
				<div class="footer-socials">
					${socials}
					<a class="social-link" href="#home"><span>Top</span><span class="link-arrow" aria-hidden="true">↑</span></a>
				</div>
			</div>
		</footer>`;

	return template
		.replaceAll("%%SITE_TITLE%%", escapeHtml(config.site.title))
		.replaceAll("%%SITE_DESCRIPTION%%", escapeHtml(config.site.description))
		.replaceAll("%%SITE_URL%%", escapeHtml(config.site.url))
		.replace("%%APP%%", app);
}
