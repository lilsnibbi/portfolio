document.addEventListener("DOMContentLoaded", () => {
	let config = null;
	try {
		config = JSON.parse(document.getElementById("site-config").textContent);
		window.siteConfig = config;
	} catch (error) {
		console.error("Failed to load site configuration:", error);
		return;
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

	// Initialize Interactivity
	initScrollEffects();

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
