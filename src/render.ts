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
	)
	.replace(
		"/public/scripts/contact.js",
		`/public/scripts/contact.js?v=${START_TIMESTAMP}`,
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

const bareUrl = (url: string) => url.replace(/^https?:\/\//, "");
const pad = (value: number) => String(value).padStart(2, "0");

const externalLink = (url: string, label: string, className = "link") =>
	`<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;

const externalButton = (url: string, label: string, className: string) =>
	`<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}<span class="arrow" aria-hidden="true">↗</span></a>`;

const readout = (index: number, label: string) =>
	`<p class="readout"><span class="idx">${pad(index)}</span>${escapeHtml(label)}</p>`;

const chips = (items: string[], label: string) =>
	`<ul class="chips" aria-label="${escapeHtml(label)}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const discordGlyph = `<svg viewBox="0 0 24 18" width="30" height="23" fill="currentColor" aria-hidden="true"><path d="M20.32 1.51A19.8 19.8 0 0 0 15.43 0c-.23.4-.46.87-.63 1.3a18.4 18.4 0 0 0-5.6 0A12.8 12.8 0 0 0 8.56 0 19.7 19.7 0 0 0 3.67 1.52C.57 6.09-.27 10.55.15 14.95a19.9 19.9 0 0 0 6 3.05c.49-.66.92-1.36 1.29-2.1-.71-.26-1.38-.59-2.02-.97.17-.13.34-.26.5-.4a14.2 14.2 0 0 0 12.17 0c.16.14.33.27.5.4-.64.38-1.32.71-2.03.98.37.73.8 1.43 1.3 2.09a19.8 19.8 0 0 0 6-3.05c.5-5.1-.84-9.53-3.54-13.44ZM8.02 12.25c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.95-2.41 2.15-2.41 1.2 0 2.17 1.09 2.15 2.4 0 1.33-.95 2.41-2.15 2.41Zm7.95 0c-1.18 0-2.15-1.08-2.15-2.4 0-1.33.94-2.41 2.15-2.41 1.2 0 2.17 1.09 2.14 2.4 0 1.33-.94 2.41-2.14 2.41Z"/></svg>`;

export function renderPage() {
	const year = new Date().getFullYear();
	const { profile, about, projects, contact, footer } = config;

	const github = profile.socialLinks.find(
		(social) => social.platform === "GitHub",
	)?.url;
	const discord = profile.socialLinks.find(
		(social) => social.platform === "Discord",
	)?.url;

	const nav = [
		{ href: "#about", label: about.sectionTag },
		{ href: "#work", label: projects.sectionTag },
		{ href: "#community", label: contact.sectionTag },
	]
		.map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
		.join("");

	const roles = profile.roles
		.map((role) => `<li>${escapeHtml(role)}</li>`)
		.join("");

	const experience = about.stats.find((stat) => stat.label === "Experience");
	const tiles = [
		...(experience ? [experience] : []),
		{ label: "Based in", value: profile.location },
		{ label: "Pronouns", value: profile.pronouns },
		{ label: "Age", value: profile.age },
	]
		.map(
			(tile) => `
				<li class="tile glass">
					<span class="tile-label">${escapeHtml(tile.label)}</span>
					<span class="tile-value">${escapeHtml(tile.value)}</span>
				</li>`,
		)
		.join("");

	// Everything in the stats that reads as a list of tools becomes a chip.
	const toolkit = about.stats
		.filter((stat) => stat !== experience)
		.flatMap((stat) => stat.value.split(" / "));

	const prose = about.paragraphs
		.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
		.join("");

	const cards = projects.list
		.map((project, index) => {
			const links = [
				project.github
					? externalButton(project.github, "Source", "btn btn-glass btn-small")
					: "",
				project.demo
					? externalButton(project.demo, "Visit", "btn btn-glass btn-small")
					: "",
			]
				.filter(Boolean)
				.join("");

			return `
				<li class="card glass reveal">
					<div class="card-head">
						<h3>${escapeHtml(project.title)}</h3>
						<p class="card-meta"><span>P-${pad(index + 1)}</span><span>${escapeHtml(project.year)}</span></p>
					</div>
					<p class="card-desc">${escapeHtml(project.description)}</p>
					${chips(project.tags, "Built with")}
					${links ? `<div class="card-links">${links}</div>` : ""}
				</li>`;
		})
		.join("");

	const socials = profile.socialLinks
		.map((social) => `<li>${externalLink(social.url, social.platform)}</li>`)
		.join("");

	const app = `
		<a class="skip-link" href="#main">Skip to content</a>
		<header class="nav-wrap">
			<nav class="nav" aria-label="Sections">
				<a class="logo" href="#top" aria-label="Back to top">${escapeHtml(profile.name.charAt(0))}</a>
				<div class="nav-links">${nav}</div>
				<p class="status" title="${escapeHtml(profile.status)}"><span class="status-dot" aria-hidden="true"></span>Available</p>
			</nav>
		</header>

		<main id="main">
			<section class="hero" id="top" aria-label="Introduction">
				<div class="inner hero-inner">
					<p class="eyebrow">${escapeHtml(profile.role)}</p>
					<h1 class="name">${escapeHtml(profile.name)}</h1>
					<p class="bio">${escapeHtml(profile.bio)}</p>
					<ul class="roles" aria-label="Roles">${roles}</ul>
					<div class="actions">
						<a class="btn btn-solid" href="#work">See the work</a>
						${github ? externalButton(github, "GitHub", "btn btn-glass") : ""}
					</div>
				</div>
				<a class="scroll-cue" href="#about">Scroll</a>
			</section>

			<section class="section" id="about" aria-labelledby="about-title">
				<div class="inner">
					<div class="section-head reveal">
						${readout(1, about.sectionTag)}
						<h2 id="about-title">${escapeHtml(about.title)}</h2>
					</div>
					<div class="about-grid">
						<div class="about-copy reveal">
							<p class="lead">${escapeHtml(about.lead)}</p>
							<div class="prose">${prose}</div>
							<div class="chips-block">
								<p class="readout">Toolkit</p>
								${chips(toolkit, "Toolkit")}
							</div>
						</div>
						<ul class="tiles reveal">${tiles}</ul>
					</div>
				</div>
			</section>

			<section class="section" id="work" aria-labelledby="work-title">
				<div class="inner">
					<div class="section-head reveal">
						${readout(2, projects.sectionTag)}
						<h2 id="work-title">${escapeHtml(projects.title)}</h2>
						<p class="section-sub">${escapeHtml(projects.subtitle)}</p>
					</div>
					<ul class="cards">${cards}</ul>
				</div>
			</section>

			<section class="section" id="community" aria-labelledby="community-title">
				<div class="inner">
					<div class="section-head reveal">
						${readout(3, contact.sectionTag)}
						<h2 id="community-title">${escapeHtml(contact.title)}</h2>
						<p class="section-sub">${escapeHtml(contact.subtitle)}</p>
					</div>
					${
						discord
							? `<div class="panel glass reveal">
								<span class="panel-icon" aria-hidden="true">${discordGlyph}</span>
								<div class="panel-copy">
									<p class="panel-title">${escapeHtml(contact.discordTitle)}</p>
									<p class="panel-desc">${escapeHtml(contact.discordDesc)}</p>
									<p class="panel-meta">${escapeHtml(contact.discordMembers)}</p>
								</div>
								${externalButton(discord, contact.discordCta, "btn btn-solid")}
							</div>`
							: ""
					}
					<p class="aside reveal">Or message me directly on Discord at <b>${escapeHtml(contact.discord)}</b>, or visit ${externalLink(contact.website, bareUrl(contact.website))}.</p>
					<div class="contact-card glass reveal" aria-labelledby="message-title">
						<h2 id="message-title">Send me a message</h2>
						<p class="section-sub">Have something in mind? Drop me a note.</p>
						<form id="contact-form" action="/api/contact" method="post">
							<div class="contact-fields">
								<label for="contact-name">Name<input id="contact-name" name="name" autocomplete="name" maxlength="80" required /></label>
								<label for="contact-email">Email<input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" required /></label>
							</div>
							<label for="contact-message">Message<textarea id="contact-message" name="message" rows="6" maxlength="3000" required></textarea></label>
							<div id="contact-turnstile" data-sitekey="${escapeHtml(Bun.env.TURNSTILE_SITE_KEY ?? "")}"></div>
							<div class="contact-actions"><button class="btn btn-solid" type="submit" disabled>Send message<span class="arrow" aria-hidden="true">↗</span></button><p id="contact-status" role="status" aria-live="polite">Loading verification…</p></div>
							<noscript>Please enable JavaScript to send a message, or contact me on Discord.</noscript>
						</form>
					</div>
				</div>
			</section>
		</main>

		<footer class="footer">
			<div class="inner">
				<p>© ${year} ${escapeHtml(footer.copyrightName)}. ${escapeHtml(footer.rightsText)}</p>
				<ul class="footer-links" aria-label="${escapeHtml(profile.socialsTitle)}">
					${socials}
					<li><a class="link" href="#top">Back to top</a></li>
				</ul>
			</div>
		</footer>`;

	return template
		.replaceAll("%%SITE_TITLE%%", escapeHtml(config.site.title))
		.replaceAll("%%SITE_DESCRIPTION%%", escapeHtml(config.site.description))
		.replaceAll("%%SITE_URL%%", escapeHtml(config.site.url))
		.replace("%%APP%%", app);
}
