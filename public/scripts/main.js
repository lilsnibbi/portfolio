document.addEventListener("DOMContentLoaded", async () => {
	let config = null;
	try {
		const response = await fetch("/api/config");
		if (!response.ok) throw new Error("Failed to fetch config");
		config = await response.json();
		window.siteConfig = config;
	} catch (error) {
		console.error("Failed to load site configuration:", error);
		return;
	}

	// --- RENDER FUNCTIONS ---

	function renderHero() {
		document.getElementById("hero-name").textContent =
			`Hi, I'm ${config.profile.name}`;

		// Active Status Badge
		if (config.profile.status) {
			const statusContainer = document.getElementById("hero-status-container");
			const statusEl = document.getElementById("hero-status");
			if (statusContainer && statusEl) {
				statusEl.textContent = config.profile.status;
				statusContainer.style.display = "inline-flex";
			}
		}

		const locationEl = document.getElementById("hero-location");
		if (locationEl && config.profile.location) {
			locationEl.textContent = config.profile.location;
		} else if (document.getElementById("hero-location-container")) {
			document.getElementById("hero-location-container").style.display = "none";
		}

		if (config.profile.pronouns) {
			const pronounsEl = document.getElementById("hero-pronouns");
			if (pronounsEl) {
				pronounsEl.textContent = config.profile.pronouns;
				document.getElementById("hero-pronouns-container").style.display =
					"flex";
			}
		}

		if (config.profile.age) {
			const ageEl = document.getElementById("hero-age");
			if (ageEl) {
				ageEl.textContent = config.profile.age;
				document.getElementById("hero-age-container").style.display = "flex";
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
                <div class="c1 reveal">
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

	function renderContact() {
		if (!config.contact) return;
		document.querySelector("#contact .section-tag").textContent =
			config.contact.sectionTag;
		document.getElementById("contact-title").textContent = config.contact.title;
		document.getElementById("contact-subtitle").textContent =
			config.contact.subtitle;

		const contactDetails = document.getElementById("contact-details");
		if (contactDetails) {
			let detailsHtml = "";
			if (config.contact.email) {
				detailsHtml += `
					<div class="contact-item">
						<i class="fa-solid fa-envelope"></i>
						<span>${config.contact.email}</span>
					</div>
				`;
			}
			if (config.contact.discord) {
				detailsHtml += `
					<div class="contact-item">
						<i class="fa-brands fa-discord"></i>
						<span>${config.contact.discord}</span>
					</div>
				`;
			}
			contactDetails.innerHTML = detailsHtml;
		}
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

	// --- INTERACTIVE FEATURES ---

	function initCustomCursor() {
		const dot = document.querySelector(".cursor-dot");
		const ring = document.querySelector(".cursor-ring");

		if (!dot || !ring) return;

		// Mouse Move: update position of custom cursor and make visible
		document.addEventListener("mousemove", (e) => {
			dot.classList.add("visible");
			ring.classList.add("visible");
			dot.style.left = `${e.clientX}px`;
			dot.style.top = `${e.clientY}px`;
			ring.style.left = `${e.clientX}px`;
			ring.style.top = `${e.clientY}px`;
		});

		// Mouse Down / Up click animation
		document.addEventListener("mousedown", () => {
			ring.classList.add("active");
		});
		document.addEventListener("mouseup", () => {
			ring.classList.remove("active");
		});

		// Hover states on interactive elements using event delegation
		const hoverElements = "a, button, input, textarea, select, .c1, .project-card, .nav-item, #btn-discord-login, #btn-discord-logout, .follow ul a";

		document.addEventListener("mouseover", (e) => {
			if (e.target.closest?.(hoverElements)) {
				dot.classList.add("hovered");
				ring.classList.add("hovered");
			}
		});

		document.addEventListener("mouseout", (e) => {
			if (e.target.closest?.(hoverElements)) {
				const relatedTarget = e.relatedTarget;
				if (!relatedTarget?.closest?.(hoverElements)) {
					dot.classList.remove("hovered");
					ring.classList.remove("hovered");
				}
			}
		});
	}

	function initScrollEffects() {
		// Intersection Observer for scroll reveal animations
		const observerOptions = {
			threshold: 0.15,
			rootMargin: "0px 0px -50px 0px",
		};

		const revealObserver = new IntersectionObserver((entries, observer) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("active");
					observer.unobserve(entry.target);
				}
			});
		}, observerOptions);

		document.querySelectorAll(".reveal").forEach((el) => {
			revealObserver.observe(el);
		});

		// Scrollspy navigation active class toggle
		const sections = document.querySelectorAll("section");
		const navItems = document.querySelectorAll(".nav-item");

		window.addEventListener("scroll", () => {
			let current = "";
			const scrollPos = window.scrollY + 200;

			sections.forEach((section) => {
				const sectionTop = section.offsetTop;
				const sectionHeight = section.offsetHeight;
				if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
					current = section.getAttribute("id");
				}
			});

			navItems.forEach((li) => {
				li.classList.remove("active");
				const link = li.querySelector("a");
				if (link && link.getAttribute("href") === `#${current}`) {
					li.classList.add("active");
				}
			});
		});
	}

	async function checkAuth() {
		try {
			const res = await fetch("/api/auth/me");
			const data = await res.json();

			const profileContainer = document.getElementById(
				"discord-profile-container",
			);
			const loginContainer = document.getElementById("discord-login-container");
			const form = document.getElementById("contact-form");

			if (data.authenticated) {
				document.getElementById("discord-username").textContent =
					data.user.username;
				document.getElementById("discord-avatar").src =
					data.user.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";

				profileContainer.style.display = "flex";
				loginContainer.style.display = "none";
				form.style.display = "block";
			} else {
				profileContainer.style.display = "none";
				loginContainer.style.display = "block";
				form.style.display = "none";
			}
		} catch (error) {
			console.error("Failed to check auth status:", error);
		}
	}

	function initContactForm() {
		const form = document.getElementById("contact-form");
		const toast = document.getElementById("toast-notification");
		const toastMessage = document.getElementById("toast-message");
		const toastIcon = document.getElementById("toast-icon");
		const btnSend = document.getElementById("btn-send");

		if (!form || !toast) return;

		if (btnSend) {
			btnSend.disabled = false;
		}

		let isSubmitting = false;

		function showToast(message, isSuccess = true) {
			if (toastMessage) toastMessage.textContent = message;
			if (toastIcon) {
				toastIcon.className = isSuccess
					? "fa-solid fa-circle-check"
					: "fa-solid fa-circle-xmark";
			}

			toast.className = "toast";
			if (isSuccess) {
				toast.classList.add("success");
			} else {
				toast.classList.add("error");
			}

			toast.classList.add("show");
			setTimeout(() => {
				toast.classList.remove("show");
			}, 4000);
		}

		form.addEventListener("submit", async (e) => {
			e.preventDefault();

			if (isSubmitting) return;

			const message = document.getElementById("contact-message").value.trim();

			if (!message) {
				showToast("Please write a message.", false);
				return;
			}

			if (message.length < 10) {
				showToast("Message must be at least 10 characters long.", false);
				return;
			}

			try {
				isSubmitting = true;
				if (btnSend) {
					btnSend.disabled = true;
					btnSend.textContent = "Sending...";
				}

				const response = await fetch("/api/send-message", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message,
					}),
				});

				const result = await response.json();

				if (response.ok && result.success) {
					showToast("Message sent successfully!", true);
					form.reset();
				} else {
					showToast(result.error || "Failed to send message.", false);
				}
			} catch (error) {
				console.error("Error submitting contact form:", error);
				showToast("An error occurred. Please try again.", false);
			} finally {
				isSubmitting = false;
				if (btnSend) {
					btnSend.disabled = false;
					btnSend.textContent = "Send Message";
				}
			}
		});
	}

	const neofetchUIText = `
			<div class="neofetch-logo">
       ,,,         ,,,
     ;"   ^;     ;'   ",
    ;    s$$$$$$$s     ;
    ,  ss$$$$$$$$$$s  ,'
     ;s$$$$$$$$$$$$$$$
     $$$$$$$$$$$$$$$$$$
    $$$$P""Y$$$Y""W$$$$$
    $$$$   "$$$"   $$$$$
    $$$$  .$$$$$.  $$$$
     $$DcaU$$$$$$$$$$
       "Y$$$"*"$$$Y"
          "$b.$$"
			</div>
			<div class="neofetch-details">
				<div><span class="t-label">OS:</span> Bun-Linux x64</div>
				<div><span class="t-label">Role:</span> ${config.profile.role}</div>
				<div><span class="t-label">Location:</span> ${config.profile.location}</div>
				<div><span class="t-label">Experience:</span> ${config.about.stats.find((s) => s.label === "Experience")?.value || "6+ Years"}</div>
				<div><span class="t-label">Uptime:</span> 20 years (age)</div>
			</div>
		`;

	function renderTerminalNeofetch() {
		const neofetchEl = document.getElementById("terminal-neofetch");
		if (!neofetchEl) return;
		neofetchEl.innerHTML = neofetchUIText;
	}

	function initTerminal() {
		const terminalBody = document.querySelector(".terminal-body");
		const terminalInput = document.getElementById("terminal-input");
		const terminalForm = document.getElementById("terminal-form");

		if (!terminalBody || !terminalInput || !terminalForm) return;

		// Focus terminal input when clicking inside window
		document.querySelector(".terminal-window").addEventListener("click", () => {
			terminalInput.focus();
		});

		terminalForm.addEventListener("submit", (e) => {
			e.preventDefault();
			const cmdText = terminalInput.value.trim();
			terminalInput.value = "";

			if (cmdText) {
				executeCommand(cmdText);
			}
		});

		function executeCommand(cmdStr) {
			const commandLine = document.createElement("div");
			commandLine.className = "terminal-line";
			commandLine.innerHTML = `<span class="t-prompt">guest@lilsnibbi.dev:~$</span> <span class="t-command">${escapeHtml(cmdStr)}</span>`;

			const inputLine = document.querySelector(".terminal-input-line");
			terminalBody.insertBefore(commandLine, inputLine);

			const output = document.createElement("div");
			output.className = "terminal-output";

			const parts = cmdStr.toLowerCase().split(" ");
			const cmd = parts[0];

			switch (cmd) {
				case "help":
					output.innerHTML = `
						<div style="margin-bottom: 4px; font-weight: bold;">Available Commands:</div>
						<div style="padding-left: 10px; line-height: 1.5;">
							<strong>neofetch</strong> - Display developer details<br>
							<strong>about</strong>    - Read the short bio<br>
							<strong>projects</strong> - List open-source work<br>
							<strong>skills</strong>   - Show development stack<br>
							<strong>contact</strong>  - View coordinates<br>
							<strong>clear</strong>    - Clear terminal window
						</div>
					`;
					break;
				case "neofetch":
					output.innerHTML = neofetchUIText;
					break;
				case "about":
					output.innerHTML = config.about.paragraphs
						.map((p) => `<div style="margin-bottom: 6px;">${p}</div>`)
						.join("");
					break;
				case "projects":
					output.innerHTML = config.projects.list
						.map(
							(p) => `
						<div style="margin-bottom: 8px;">
							<div style="font-weight: bold;">${p.title}</div>
							<div style="color: #888;">${p.description}</div>
							<div style="font-size: 0.75rem; color: #666;">Tags: ${p.tags.join(", ")}</div>
						</div>
					`,
						)
						.join("");
					break;
				case "skills":
					output.innerHTML = `
						<div style="margin-bottom: 4px;"><span class="t-label">Languages:</span> ${config.about.stats.find((s) => s.label === "Languages")?.value || ""}</div>
						<div><span class="t-label">Core Stack:</span> ${config.about.stats.find((s) => s.label === "Stack")?.value || ""}</div>
					`;
					break;
				case "contact":
					output.innerHTML = `
						<div style="margin-bottom: 4px;"><span class="t-label">Email:</span> ${config.contact?.email || ""}</div>
						<div><span class="t-label">Discord:</span> @${config.contact?.discord || ""}</div>
					`;
					break;
				case "clear": {
					const allLines = Array.from(terminalBody.children);
					allLines.forEach((line) => {
						if (!line.classList.contains("terminal-input-line")) {
							line.remove();
						}
					});
					terminalBody.scrollTop = 0;
					return;
				}
				default:
					output.innerHTML = `<span style="color: #aaaaaa;">Command not found: '${escapeHtml(cmd)}'. Type 'help' for support.</span>`;
			}

			output.style.margin = "8px 0 16px 0";
			terminalBody.insertBefore(output, inputLine);
			terminalBody.scrollTop = terminalBody.scrollHeight;
		}

		function escapeHtml(text) {
			const div = document.createElement("div");
			div.innerText = text;
			return div.innerHTML;
		}
	}

	// Initialize Rendering
	renderHero();
	renderAbout();
	renderTerminalNeofetch();
	renderProjects();
	renderContact();
	renderFooter();

	// Initialize Interactivity
	initCustomCursor();
	initScrollEffects();
	initContactForm();
	initTerminal();
	checkAuth();

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
