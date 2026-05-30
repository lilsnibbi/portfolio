document.addEventListener("DOMContentLoaded", () => {
	const config = window.siteConfig;
	if (!config) return;

	// --- RENDER FUNCTIONS ---

	function renderHero() {
		document.getElementById("hero-name").textContent =
			`Hi, I'm ${config.profile.name}`;
			
		const locationEl = document.getElementById("hero-location");
		if (locationEl && config.profile.location) {
			locationEl.textContent = config.profile.location;
		} else if (document.getElementById("hero-location-container")) {
			document.getElementById("hero-location-container").style.display = 'none';
		}

		if (config.profile.pronouns) {
			const pronounsEl = document.getElementById("hero-pronouns");
			if (pronounsEl) {
				pronounsEl.textContent = config.profile.pronouns;
				document.getElementById("hero-pronouns-container").style.display = 'flex';
			}
		}

		if (config.profile.age) {
			const ageEl = document.getElementById("hero-age");
			if (ageEl) {
				ageEl.textContent = config.profile.age;
				document.getElementById("hero-age-container").style.display = 'flex';
			}
		}

		document.getElementById("hero-bio").innerHTML =
			`<p>${config.profile.bio}</p>`;
		document.querySelector(".followw").textContent =
			config.profile.socialsTitle;

		const heroSocials = document.getElementById("hero-socials");
		heroSocials.innerHTML = config.profile.socialLinks
			.map(
				(social) =>
					`<li><a href="${social.url}" target="_blank" aria-label="${social.platform}"><i class="${social.icon}"></i></a></li>`,
			)
			.join("");
	}

	function renderAbout() {
		document.querySelector("#about .section-tag").textContent =
			config.about.sectionTag;
		document.getElementById("about-title").textContent = config.about.title;
		const aboutParagraphs = document.getElementById("about-paragraphs");
		aboutParagraphs.innerHTML = config.about.paragraphs
			.map((p) => `<p>${p}</p>`)
			.join("");

		const aboutStats = document.getElementById("about-stats");
		aboutStats.innerHTML = config.about.stats
			.map(
				(stat) => `
                <div class="c1">
                    <i class="${stat.icon}"></i>
                    <h3>${stat.label}</h3>
                    <p>${stat.value}</p>
                </div>
            `,
			)
			.join("");
	}

	function renderProjects() {
		document.querySelector("#project .section-tag").textContent =
			config.projects.sectionTag;
		document.querySelector("#project h1").textContent = config.projects.title;
		document.querySelector(".info-pro p").textContent =
			config.projects.subtitle;

		const projectsGrid = document.getElementById("projects-grid");
		projectsGrid.innerHTML = config.projects.list
			.map((project) => {
				const imgHtml =
					project.image && project.image !== "#"
						? `<img src="${project.image}" alt="${project.title}">`
						: "";
				const githubBtn =
					project.github && project.github !== "#"
						? `<a href="${project.github}" class="btn" target="_blank"><i class="fab fa-github"></i> GitHub</a>`
						: "";
				const demoBtn =
					project.demo && project.demo !== "#"
						? `<a href="${project.demo}" class="btn" target="_blank"><i class="fas fa-external-link-alt"></i> Live Demo</a>`
						: "";

				return `
                <div class="project-card">
                    ${imgHtml}
                    <div class="project-content">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <div class="skills">
                            ${project.tags.map((tag) => `<a href="#">${tag}</a>`).join("")}
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
	}

	function renderFooter() {
		const footerName = document.getElementById("footer-name");
		if (footerName) footerName.textContent = config.footer.logoText;
		
		const footerCopy = document.querySelector(".footer-copy");
		if (footerCopy) {
			footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} ${config.footer.copyrightName}. ${config.footer.rightsText}`;
		}

		const footerSocials = document.getElementById("footer-socials");
		if (footerSocials) {
			footerSocials.innerHTML = config.profile.socialLinks
			.map(
				(social) => `
                <a href="${social.url}" target="_blank" aria-label="${social.platform}"><i class="${social.icon}"></i></a>
            `,
			)
			.join("");
		}
	}

	// Initialize Rendering
	renderHero();
	renderAbout();
	renderProjects();
	renderFooter();

	// Typing Effect
	const typingElement = document.getElementById("hero-role");
	const words = config.profile.roles || [config.profile.role];
	let wordIndex = 0;
	let charIndex = 0;
	let isDeleting = false;
	const typingSpeed = 100;

	function type() {
		if (!typingElement) return;
		const currentWord = words[wordIndex];
		const displayedText = currentWord.substring(0, charIndex);

		typingElement.innerHTML = `${displayedText}<span class="cursor">|</span>`;

		if (!isDeleting && charIndex < currentWord.length) {
			charIndex++;
			setTimeout(type, typingSpeed);
		} else if (isDeleting && charIndex > 0) {
			charIndex--;
			setTimeout(type, typingSpeed / 2);
		} else {
			isDeleting = !isDeleting;
			if (!isDeleting) {
				wordIndex = (wordIndex + 1) % words.length;
			}
			setTimeout(type, 1000);
		}
	}

	type();

});
