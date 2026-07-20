document.addEventListener("DOMContentLoaded", () => {
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const configElement = document.querySelector("#site-config");
	const roleElement = document.querySelector("#role-text");
	const header = document.querySelector(".site-header");
	const navLinks = [
		...document.querySelectorAll('.site-header nav a[href^="#"]'),
	];
	const sections = [...document.querySelectorAll("main section[id]")];

	const navigationObserver = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (!visible) return;

			for (const link of navLinks) {
				link.classList.toggle(
					"is-active",
					link.getAttribute("href") === `#${visible.target.id}`,
				);
			}
		},
		{ rootMargin: "-30% 0px -55%", threshold: [0, 0.2, 0.6] },
	);

	for (const section of sections) navigationObserver.observe(section);

	if (!reduceMotion) {
		const observer = new IntersectionObserver(
			(entries, revealObserver) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-visible");
					revealObserver.unobserve(entry.target);
				}
			},
			{ threshold: 0.12, rootMargin: "0px 0px -48px" },
		);

		for (const element of document.querySelectorAll(".reveal")) {
			observer.observe(element);
		}

		window.addEventListener(
			"pointermove",
			(event) => {
				document.documentElement.style.setProperty(
					"--pointer-x",
					`${event.clientX}px`,
				);
				document.documentElement.style.setProperty(
					"--pointer-y",
					`${event.clientY}px`,
				);
			},
			{ passive: true },
		);
	} else {
		for (const element of document.querySelectorAll(".reveal")) {
			element.classList.add("is-visible");
		}
	}

	let previousScroll = window.scrollY;
	window.addEventListener(
		"scroll",
		() => {
			const currentScroll = window.scrollY;
			header?.classList.toggle(
				"is-hidden",
				currentScroll > previousScroll && currentScroll > 160,
			);
			previousScroll = currentScroll;
		},
		{ passive: true },
	);

	if (!configElement || !roleElement || reduceMotion) return;

	try {
		const { roles } = JSON.parse(configElement.textContent || "{}");
		if (!Array.isArray(roles) || roles.length < 2) return;

		let currentRole = 0;
		window.setInterval(() => {
			roleElement.classList.add("is-changing");
			window.setTimeout(() => {
				currentRole = (currentRole + 1) % roles.length;
				roleElement.textContent = roles[currentRole];
				roleElement.classList.remove("is-changing");
			}, 220);
		}, 2800);
	} catch {
		// The server always provides this payload; keep the static role if parsing fails.
	}
});
