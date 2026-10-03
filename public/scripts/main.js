document.addEventListener("DOMContentLoaded", () => {
	const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
	const sections = links
		.map((link) => document.getElementById(link.hash.slice(1)))
		.filter(Boolean);
	const header = document.querySelector(".site-header");
	let scheduled = false;

	document.addEventListener("focusin", (event) => {
		const target = event.target;
		if (
			!target.matches("a, button, input, textarea") ||
			!target.matches(":focus-visible") ||
			target.closest(".site-header") ||
			target.classList.contains("skip-link")
		)
			return;
		requestAnimationFrame(() => {
			if (document.activeElement !== target) return;
			const bounds = target.getBoundingClientRect();
			if (
				bounds.top < (header?.offsetHeight ?? 0) + 16 ||
				bounds.bottom > window.innerHeight - 16
			)
				target.scrollIntoView({ block: "center", behavior: "instant" });
		});
	});

	const updateNavigation = () => {
		scheduled = false;
		const offset = (header?.offsetHeight ?? 0) + 80;
		const atEnd =
			window.scrollY > 0 &&
			Math.ceil(window.scrollY + window.innerHeight) >=
				document.documentElement.scrollHeight;
		const active = atEnd
			? sections.at(-1)
			: sections.findLast(
					(section) => section.getBoundingClientRect().top <= offset,
				);
		for (const link of links) {
			if (active && link.hash === `#${active.id}`) {
				link.setAttribute("aria-current", "location");
			} else {
				link.removeAttribute("aria-current");
			}
		}
	};

	window.addEventListener(
		"scroll",
		() => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(updateNavigation);
		},
		{ passive: true },
	);
	window.addEventListener("resize", updateNavigation, { passive: true });
	updateNavigation();
});
