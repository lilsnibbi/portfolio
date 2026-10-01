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
const arrow = '<span class="arrow" aria-hidden="true">&#8599;</span>';
const spark = `<svg viewBox="0 0 160 160" fill="none" aria-hidden="true"><path d="M80 8v144M8 80h144M29 29l102 102M29 131L131 29" stroke="currentColor" stroke-width="2"/><circle cx="80" cy="80" r="47" stroke="currentColor" stroke-width="1" opacity=".3"/></svg>`;

const externalLink = (
	url: string,
	label: string,
	className = "text-link",
	accessibleLabel = label,
) =>
	`<a class="${className}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(accessibleLabel)} (opens in a new tab)">${escapeHtml(label)}${arrow}</a>`;

const readout = (index: number, label: string) =>
	`<p class="section-label"><span>${pad(index)}</span>${escapeHtml(label)}</p>`;

const tags = (items: string[], label: string) =>
	`<ul class="tags" aria-label="${escapeHtml(label)}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

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

	const prose = about.paragraphs
		.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
		.join("");
	const stats = about.stats
		.map(
			(stat) =>
				`<div><dt>${escapeHtml(stat.label)}</dt><dd>${escapeHtml(stat.value)}</dd></div>`,
		)
		.join("");

	const projectRows = projects.list
		.map((project, index) => {
			const links = [
				project.demo
					? externalLink(
							project.demo,
							"Visit website",
							"text-link",
							`Visit ${project.title}'s website`,
						)
					: "",
				project.github
					? externalLink(
							project.github,
							"View source",
							"text-link",
							`View ${project.title}'s source`,
						)
					: "",
				project.development
					? externalLink(
							project.development,
							"v2 development",
							"text-link",
							`Follow ${project.title}'s v2 development`,
						)
					: "",
			]
				.filter(Boolean)
				.join("");

			return `
				<li class="project">
					<span class="project-number" aria-hidden="true">${pad(index + 1)}</span>
					<div class="project-copy">
						<p class="project-meta">${escapeHtml(project.status ?? "Project")}<span aria-hidden="true"> / </span>${escapeHtml(project.year)}</p>
						<h3>${escapeHtml(project.title)}</h3>
						<p class="project-description">${escapeHtml(project.description)}</p>
						${tags(project.tags, `${project.title} technologies and source availability`)}
					</div>
					${links ? `<div class="project-links">${links}</div>` : ""}
				</li>`;
		})
		.join("");

	const socials = profile.socialLinks
		.map((social) => `<li>${externalLink(social.url, social.platform)}</li>`)
		.join("");

	const app = `
		<a class="skip-link" href="#main">Skip to content</a>
		<header class="site-header">
			<nav class="inner nav" aria-label="Main navigation">
				<a class="wordmark" href="#top" aria-label="${escapeHtml(profile.name)} — back to top"><span class="wordmark-symbol">${spark}</span>${escapeHtml(footer.logoText)}</a>
				<div class="nav-links">${nav}</div>
				${github ? externalLink(github, "GitHub", "header-link") : ""}
			</nav>
		</header>

		<main id="main" tabindex="-1">
			<section class="hero inner" id="top" aria-labelledby="intro-title">
				<div class="hero-overline">
					<p class="eyebrow">${escapeHtml(profile.role)}<span class="eyebrow-divider" aria-hidden="true"> / </span>${escapeHtml(profile.location)}</p>
					<p class="availability"><span aria-hidden="true"></span>${escapeHtml(profile.status)}</p>
				</div>
				<div class="hero-display">
					<h1 id="intro-title">${escapeHtml(profile.name)}<span class="name-period" aria-hidden="true">.</span></h1>
					<div class="hero-symbol">${spark}</div>
				</div>
				<div class="hero-bottom">
					<p class="hero-bio">${escapeHtml(profile.bio)}</p>
					<div class="hero-actions">
						<a class="button" href="#work">Explore my work<span aria-hidden="true">&#8595;</span></a>
						<a class="text-link" href="#community">Let's talk${arrow}</a>
					</div>
				</div>
				<div class="hero-footnote"><p>Backend. Tools. Community.</p><a class="text-link" href="#about">A little more about me<span aria-hidden="true">&#8595;</span></a></div>
			</section>

			<section class="section inner" id="about" aria-labelledby="about-title">
				<div class="section-grid">
					${readout(1, about.sectionTag)}
					<div>
						<h2 id="about-title">${escapeHtml(about.title)}</h2>
						<p class="section-lead">${escapeHtml(about.lead)}</p>
						<div class="about-content">
							<div class="prose">${prose}</div>
							<dl class="profile-details">${stats}</dl>
						</div>
					</div>
				</div>
			</section>

			<section class="section inner" id="work" aria-labelledby="work-title">
				<div class="section-grid">
					${readout(2, projects.sectionTag)}
					<div>
						<div class="section-heading">
							<h2 id="work-title">${escapeHtml(projects.title)}</h2>
							<p class="section-description">${escapeHtml(projects.subtitle)}</p>
						</div>
						<ul class="projects">${projectRows}</ul>
						${github ? externalLink(github, "More on GitHub", "text-link more-projects") : ""}
					</div>
				</div>
			</section>

			<section class="section contact-section inner" id="community" aria-labelledby="contact-title">
				<div class="section-grid">
					${readout(3, contact.sectionTag)}
					<div class="contact-layout">
						<div class="contact-copy">
							<h2 id="contact-title">${escapeHtml(contact.title)}</h2>
							<p class="section-description">${escapeHtml(contact.subtitle)}</p>
							<p class="discord-handle">Find me on Discord<span>${escapeHtml(contact.discord)}</span></p>
							${
								discord
									? `<div class="community">
								<h3>${escapeHtml(contact.discordTitle)}</h3>
								<p>${escapeHtml(contact.discordDesc)}</p>
								<p class="community-members">${escapeHtml(contact.discordMembers)}</p>
								${externalLink(discord, contact.discordCta)}
								${externalLink(contact.website, bareUrl(contact.website))}
							</div>`
									: ""
							}
						</div>
						<div class="contact-form-wrap">
							<h3 id="message-title">Send a message</h3>
							<p class="form-intro">Have something in mind? Drop me a note.</p>
							<form id="contact-form" action="/api/contact" method="post" aria-labelledby="message-title">
								<div class="contact-fields">
									<label for="contact-name">Name<input id="contact-name" name="name" autocomplete="name" maxlength="80" required /></label>
									<label for="contact-email">Email<input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" required /></label>
								</div>
								<label for="contact-message">Message<textarea id="contact-message" name="message" rows="5" maxlength="3000" required></textarea></label>
								<div id="contact-turnstile" data-sitekey="${escapeHtml(Bun.env.TURNSTILE_SITE_KEY ?? "")}"></div>
								<div class="contact-actions"><button class="button" type="submit" disabled>Send message${arrow}</button><p id="contact-status" role="status" aria-live="polite">Loading verification.</p></div>
								<noscript>Please enable JavaScript to send a message, or contact me on Discord.</noscript>
							</form>
						</div>
					</div>
				</div>
			</section>
		</main>

		<footer class="footer inner">
			<div class="footer-top">
				<a class="wordmark" href="#top">${escapeHtml(footer.logoText)}<span aria-hidden="true">.</span></a>
				<ul class="footer-links" aria-label="${escapeHtml(profile.socialsTitle)}">${socials}<li><a class="text-link" href="#top">Back to top<span aria-hidden="true">&#8593;</span></a></li></ul>
			</div>
			<p class="copyright">&#169; ${year} ${escapeHtml(footer.copyrightName)}. ${escapeHtml(footer.rightsText)}</p>
		</footer>`;

	return template
		.replaceAll("%%SITE_TITLE%%", escapeHtml(config.site.title))
		.replaceAll("%%SITE_DESCRIPTION%%", escapeHtml(config.site.description))
		.replaceAll("%%SITE_URL%%", escapeHtml(config.site.url))
		.replace("%%APP%%", app);
}
