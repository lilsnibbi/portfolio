document.addEventListener("DOMContentLoaded", () => {
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	// --- active section marker in the rail ---
	const navLinks = [...document.querySelectorAll('.rail nav a[href^="#"]')];
	const sections = [...document.querySelectorAll("main section[id]")];

	const navigationObserver = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (!visible) return;

			const id = visible.target.id;
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

	// --- scroll progress along the rail edge ---
	const setProgress = () => {
		const doc = document.documentElement;
		const max = doc.scrollHeight - window.innerHeight;
		doc.style.setProperty(
			"--progress",
			max > 0 ? String(Math.min(1, window.scrollY / max)) : "0",
		);
	};
	window.addEventListener("scroll", setProgress, { passive: true });
	window.addEventListener("resize", setProgress, { passive: true });
	setProgress();

	// --- scroll reveal ---
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
	} else {
		for (const element of document.querySelectorAll(".reveal")) {
			element.classList.add("is-visible");
		}
	}
});
