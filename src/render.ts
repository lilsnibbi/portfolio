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

export function renderPage() {
	const socials = config.profile.socialLinks
		.map((social) => externalLink(social.url, social.platform, "social-link"))
		.join("");

	const aboutParagraphs = config.about.paragraphs
		.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
		.join("");

	const logLines = config.about.stats
		.map(
			(stat) => `
				<div class="log-line">
					<dt>${escapeHtml(stat.label.toLowerCase())}</dt>
					<dd>${escapeHtml(stat.value)}</dd>
				</div>`,
		)
		.join("");

	const projects = config.projects.list
		.map((project) => {
			const links = [
				project.github ? externalLink(project.github, "Source") : "",
				project.demo ? externalLink(project.demo, "Visit") : "",
			]
				.filter(Boolean)
				.join("");

			return `
				<article class="project reveal">
					<div class="project-head">
						<h3>${escapeHtml(project.title)}</h3>
						<div class="project-links">${links}</div>
					</div>
					<p class="project-desc">${escapeHtml(project.description)}</p>
					<div class="project-foot">
						<ul class="tags" aria-label="Technologies">
							${project.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}
						</ul>
						<span class="project-year">${escapeHtml(project.year)}</span>
					</div>
				</article>`;
		})
		.join("");

	const discord = config.profile.socialLinks.find(
		(social) => social.platform === "Discord",
	)?.url;
	const github = config.profile.socialLinks.find(
		(social) => social.platform === "GitHub",
	)?.url;

	const firstRole = config.profile.roles[0] ?? config.profile.role;

	const app = `
		<a class="skip-link" href="#main">Skip to content</a>
		<header class="nav">
			<a class="brand" href="#home" aria-label="Back to top">${escapeHtml(config.profile.name.toLowerCase())}<span class="brand-dot">.</span></a>
			<nav aria-label="Primary navigation">
				<a href="#about">About</a>
				<a href="#work">Work</a>
				<a href="#contact">Contact</a>
			</nav>
			<a class="nav-cta" href="mailto:${escapeHtml(config.contact.email)}">Let's talk</a>
		</header>

		<main id="main">
			<section class="hero" id="home">
				<h1 class="hero-name">${escapeHtml(config.profile.name.toLowerCase())}<span class="hero-dot">.</span></h1>
				<p class="shell-line">
					<span class="prompt" aria-hidden="true">~ $</span>
					<span id="typed" aria-live="polite">${escapeHtml(firstRole)}</span><span class="caret" aria-hidden="true"></span>
				</p>
				<p class="hero-bio">${escapeHtml(config.profile.bio)}</p>
				<ul class="hero-meta" aria-label="Personal details">
					<li>${escapeHtml(config.profile.pronouns.toLowerCase())}</li>
					<li>${escapeHtml(config.profile.age)}</li>
				</ul>
				<div class="hero-actions">
					<a class="btn btn-solid" href="#work">See what I've shipped <span aria-hidden="true">↓</span></a>
					${github ? externalLink(github, "GitHub", "btn btn-ghost") : ""}
				</div>
			</section>

			<section class="section" id="about">
				<p class="section-tag">// ${escapeHtml(config.about.sectionTag.toLowerCase())}</p>
				<h2>${escapeHtml(config.about.title)}</h2>
				<div class="about-cols">
					<p class="about-lead reveal">${escapeHtml(config.about.lead)}</p>
					<div class="about-body reveal">
						${aboutParagraphs}
						<dl class="log-list">${logLines}</dl>
					</div>
				</div>
			</section>

			<section class="section" id="work">
				<p class="section-tag">// ${escapeHtml(config.projects.sectionTag.toLowerCase())}</p>
				<h2>${escapeHtml(config.projects.title)}</h2>
				<p class="section-sub">${escapeHtml(config.projects.subtitle)}</p>
				<div class="projects">${projects}</div>
			</section>

			<section class="section" id="contact">
				<p class="section-tag">// ${escapeHtml(config.contact.sectionTag.toLowerCase())}</p>
				<h2>${escapeHtml(config.contact.title)}</h2>
				<p class="section-sub">${escapeHtml(config.contact.subtitle)}</p>
				${
					discord
						? `<a class="discord-card reveal" href="${escapeHtml(discord)}" target="_blank" rel="noreferrer">
								<span class="discord-glyph" aria-hidden="true">
									<svg viewBox="0 0 24 18" width="34" height="26" fill="currentColor" aria-hidden="true"><path d="M20.32 1.51A19.8 19.8 0 0 0 15.43 0c-.23.4-.46.87-.63 1.3a18.4 18.4 0 0 0-5.6 0A12.8 12.8 0 0 0 8.56 0 19.7 19.7 0 0 0 3.67 1.52C.57 6.09-.27 10.55.15 14.95a19.9 19.9 0 0 0 6 3.05c.49-.66.92-1.36 1.29-2.1-.71-.26-1.38-.59-2.02-.97.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.17 0c.16.14.33.27.5.4-.64.38-1.32.71-2.03.98.37.73.8 1.43 1.3 2.09a19.8 19.8 0 0 0 6-3.05c.5-5.1-.84-9.53-3.54-13.44ZM8.02 12.25c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.4 0 1.33-.95 2.41-2.15 2.41Zm7.95 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.94-2.41 2.15-2.41 1.2 0 2.17 1.09 2.14 2.4 0 1.33-.94 2.41-2.14 2.41Z"/></svg>
								</span>
								<span class="discord-copy">
									<span class="discord-title">${escapeHtml(config.contact.discordTitle)}</span>
									<span class="discord-desc">${escapeHtml(config.contact.discordDesc)}</span>
									<span class="discord-meta">
										<span class="discord-members"><span class="sb-dot" aria-hidden="true"></span>${escapeHtml(config.contact.discordMembers)}</span>
										<span class="discord-invite">${escapeHtml(discord.replace(/^https?:\/\//, ""))}</span>
									</span>
								</span>
								<span class="discord-cta">${escapeHtml(config.contact.discordCta)}<span class="link-arrow" aria-hidden="true">↗</span></span>
							</a>`
						: ""
				}
				<p class="contact-alt reveal">
					<span>${escapeHtml(config.contact.emailNote)}</span>
					<a class="text-link" href="mailto:${escapeHtml(config.contact.email)}"><span>${escapeHtml(config.contact.email)}</span></a>
					<span class="contact-handle">or dm @${escapeHtml(config.contact.discord)}</span>
				</p>
			</section>
		</main>

		<footer>
			<p>© ${new Date().getFullYear()} ${escapeHtml(config.footer.copyrightName)}. ${escapeHtml(config.footer.rightsText)}</p>
			<div class="footer-socials">${socials}</div>
		</footer>

		<div class="statusbar" aria-hidden="true">
			<span class="sb-item sb-status"><span class="sb-dot"></span>${escapeHtml(config.profile.status.toLowerCase())}</span>
			<span class="sb-item sb-path">~/<span id="status-section">home</span></span>
			<span class="sb-spacer"></span>
			<span class="sb-item sb-place">${escapeHtml(config.profile.location.toLowerCase())} <span id="status-clock"></span></span>
		</div>`;

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
