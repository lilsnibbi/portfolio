document.addEventListener("DOMContentLoaded", () => {
	const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
	const sections = links
		.map((link) => document.getElementById(link.hash.slice(1)))
		.filter(Boolean);
	const header = document.querySelector(".site-header");
	let scheduled = false;

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
