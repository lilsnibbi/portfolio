document.addEventListener("DOMContentLoaded", () => {
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	// --- active section: nav links + status bar path ---
	const navLinks = [...document.querySelectorAll('.nav nav a[href^="#"]')];
	const sectionLabel = document.querySelector("#status-section");
	const sections = [...document.querySelectorAll("main section[id]")];

	const navigationObserver = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (!visible) return;

			const id = visible.target.id;
			if (sectionLabel) sectionLabel.textContent = id;
			for (const link of navLinks) {
				link.classList.toggle(
					"is-active",
					link.getAttribute("href") === `#${id}`,
				);
			}
		},
		{ rootMargin: "-35% 0px -50%", threshold: [0, 0.2, 0.6] },
	);

	for (const section of sections) navigationObserver.observe(section);

	// --- status bar clock (home timezone) ---
	const clock = document.querySelector("#status-clock");
	if (clock) {
		const formatter = new Intl.DateTimeFormat("en-AU", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "Australia/Sydney",
		});
		const tick = () => {
			clock.textContent = formatter.format(new Date());
		};
		tick();
		window.setInterval(tick, 30_000);
	}

	// --- scroll reveal + pointer glow ---
	if (!reduceMotion) {
		const revealObserver = new IntersectionObserver(
			(entries, observer) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			},
			{ threshold: 0.12, rootMargin: "0px 0px -48px" },
		);

		for (const element of document.querySelectorAll(".reveal")) {
			revealObserver.observe(element);
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

	// --- shell typewriter for roles ---
	const typedElement = document.querySelector("#typed");
	const configElement = document.querySelector("#site-config");
	if (!typedElement || !configElement) return;

	let roles = [];
	try {
		roles = JSON.parse(configElement.textContent || "{}").roles ?? [];
	} catch {
		return;
	}
	if (!Array.isArray(roles) || roles.length < 2 || reduceMotion) return;

	const TYPE_MS = 55;
	const DELETE_MS = 28;
	const HOLD_MS = 2000;
	let roleIndex = 0;

	const type = (text, position) => {
		typedElement.textContent = text.slice(0, position);
		if (position < text.length) {
			window.setTimeout(() => type(text, position + 1), TYPE_MS);
		} else {
			window.setTimeout(() => erase(text, text.length), HOLD_MS);
		}
	};

	const erase = (text, position) => {
		typedElement.textContent = text.slice(0, position);
		if (position > 0) {
			window.setTimeout(() => erase(text, position - 1), DELETE_MS);
		} else {
			roleIndex = (roleIndex + 1) % roles.length;
			type(roles[roleIndex], 0);
		}
	};

	window.setTimeout(
		() => erase(roles[roleIndex], roles[roleIndex].length),
		HOLD_MS,
	);
});
