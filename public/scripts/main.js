document.addEventListener("DOMContentLoaded", () => {
	const reduceMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const finePointer = window.matchMedia("(pointer: fine)").matches;

	// ---------------------------------------------------------------
	// Hex field: a fixed canvas grid that brightens around the pointer.
	// The base grid is rasterised once per resize; each frame only the
	// cells inside the glow radius are redrawn on top of it.
	// ---------------------------------------------------------------
	const canvas = document.getElementById("field");
	if (canvas) {
		const ctx = canvas.getContext("2d");
		const base = document.createElement("canvas");
		const baseCtx = base.getContext("2d");

		const SIZE = 20; // hex circumradius in CSS px
		const W = Math.sqrt(3) * SIZE; // pointy-top hex width
		const ROW = SIZE * 1.5; // vertical distance between rows
		const RADIUS = 250; // glow radius
		const BASE_ALPHA = 0.06;

		let dpr = 1;
		let width = 0;
		let height = 0;
		let cells = [];
		let last = 0;
		let idleSince = performance.now();
		let running = false;

		const target = { x: -9999, y: -9999 };
		const eased = { x: -9999, y: -9999 };
		let hasPointer = false;

		const hexPath = (context, x, y, r) => {
			context.beginPath();
			for (let i = 0; i < 6; i++) {
				const angle = (Math.PI / 3) * i - Math.PI / 6;
				const px = x + r * Math.cos(angle);
				const py = y + r * Math.sin(angle);
				if (i === 0) context.moveTo(px, py);
				else context.lineTo(px, py);
			}
			context.closePath();
		};

		const paintBase = () => {
			base.width = canvas.width;
			base.height = canvas.height;
			baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
			baseCtx.clearRect(0, 0, width, height);
			baseCtx.lineWidth = 1;
			baseCtx.strokeStyle = `rgba(255,255,255,${BASE_ALPHA})`;
			for (const cell of cells) {
				hexPath(baseCtx, cell.x, cell.y, SIZE - 1.5);
				baseCtx.stroke();
			}
		};

		const resize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			cells = [];
			const rows = Math.ceil(height / ROW) + 2;
			const cols = Math.ceil(width / W) + 2;
			for (let r = -1; r < rows; r++) {
				const offset = r % 2 === 0 ? 0 : W / 2;
				for (let c = -1; c < cols; c++) {
					cells.push({ x: c * W + offset, y: r * ROW });
				}
			}
			paintBase();
			draw(performance.now(), true);
		};

		const draw = (now, force = false) => {
			const dt = Math.min(48, now - last || 16);
			last = now;

			// When the pointer has been still for a while, let the glow roam.
			if (!hasPointer || now - idleSince > 3000) {
				const t = now / 1000;
				target.x = width * (0.5 + 0.34 * Math.sin(t * 0.21));
				target.y = height * (0.45 + 0.3 * Math.sin(t * 0.16 + 1.3));
			}

			const k = 1 - Math.exp(-dt / 110);
			eased.x += (target.x - eased.x) * k;
			eased.y += (target.y - eased.y) * k;

			ctx.clearRect(0, 0, width, height);
			ctx.drawImage(base, 0, 0, width, height);

			const r2 = RADIUS * RADIUS;
			ctx.lineWidth = 1;
			for (const cell of cells) {
				const dx = cell.x - eased.x;
				const dy = cell.y - eased.y;
				const d2 = dx * dx + dy * dy;
				if (d2 > r2) continue;
				const t = 1 - Math.sqrt(d2) / RADIUS;
				const glow = t * t;
				ctx.strokeStyle = `rgba(255,255,255,${BASE_ALPHA + glow * 0.7})`;
				hexPath(ctx, cell.x, cell.y, SIZE - 1.5);
				ctx.stroke();
				if (glow > 0.15) {
					ctx.fillStyle = `rgba(255,255,255,${(glow - 0.15) * 0.14})`;
					ctx.fill();
				}
			}

			if (!force && running) requestAnimationFrame(draw);
		};

		const start = () => {
			if (running) return;
			running = true;
			last = performance.now();
			requestAnimationFrame(draw);
		};

		const stop = () => {
			running = false;
		};

		const onMove = (x, y) => {
			target.x = x;
			target.y = y;
			hasPointer = true;
			idleSince = performance.now();
		};

		window.addEventListener("resize", resize, { passive: true });
		resize();

		// Full strength behind the hero, then settle to a faint texture so
		// body text further down sits on near-solid black.
		const heroSection = document.getElementById("top");
		const fade = () => {
			const heroHeight = heroSection ? heroSection.offsetHeight : height;
			const progress = Math.min(
				1,
				Math.max(0, (window.scrollY - heroHeight * 0.35) / (heroHeight * 0.5)),
			);
			canvas.style.opacity = String(1 - progress * 0.65);
		};
		window.addEventListener("scroll", fade, { passive: true });
		fade();

		if (reduceMotion) {
			// Static grid with a single soft glow at the centre.
			hasPointer = false;
			eased.x = target.x = width / 2;
			eased.y = target.y = height * 0.45;
			draw(performance.now(), true);
		} else {
			if (finePointer) {
				window.addEventListener(
					"pointermove",
					(event) => onMove(event.clientX, event.clientY),
					{ passive: true },
				);
			}
			window.addEventListener(
				"touchmove",
				(event) => {
					const touch = event.touches[0];
					if (touch) onMove(touch.clientX, touch.clientY);
				},
				{ passive: true },
			);
			document.addEventListener("visibilitychange", () => {
				if (document.hidden) stop();
				else start();
			});
			start();
		}
	}

	// ---------------------------------------------------------------
	// Glass surfaces: track the pointer so the edge highlight follows it.
	// ---------------------------------------------------------------
	if (finePointer && !reduceMotion) {
		for (const surface of document.querySelectorAll(".glass")) {
			surface.addEventListener(
				"pointermove",
				(event) => {
					const rect = surface.getBoundingClientRect();
					surface.style.setProperty("--mx", `${event.clientX - rect.left}px`);
					surface.style.setProperty("--my", `${event.clientY - rect.top}px`);
				},
				{ passive: true },
			);
		}
	}

	// ---------------------------------------------------------------
	// Active section in the nav.
	// ---------------------------------------------------------------
	const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
	const hero = document.getElementById("top");
	const sections = links
		.map((link) => document.querySelector(link.getAttribute("href")))
		.filter(Boolean);

	const setActive = (id) => {
		for (const link of links) {
			const active = link.getAttribute("href") === `#${id}`;
			link.classList.toggle("is-active", active);
			if (active) link.setAttribute("aria-current", "true");
			else link.removeAttribute("aria-current");
		}
	};

	const navObserver = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
			if (!visible) return;
			setActive(visible.target === hero ? "" : visible.target.id);
		},
		{ rootMargin: "-30% 0px -55%", threshold: [0, 0.25, 0.5, 1] },
	);

	if (hero) navObserver.observe(hero);
	for (const section of sections) navObserver.observe(section);

	// ---------------------------------------------------------------
	// Reveal sections as they enter the viewport.
	// ---------------------------------------------------------------
	const revealables = document.querySelectorAll(".reveal");
	if (reduceMotion) {
		for (const element of revealables) element.classList.add("is-in");
	} else {
		const revealObserver = new IntersectionObserver(
			(entries, observer) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					entry.target.classList.add("is-in");
					observer.unobserve(entry.target);
				}
			},
			{ threshold: 0.1, rootMargin: "0px 0px -40px" },
		);
		for (const element of revealables) revealObserver.observe(element);
	}
});
