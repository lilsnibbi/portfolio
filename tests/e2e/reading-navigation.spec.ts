import {
	type ConsoleMessage,
	expect,
	type Locator,
	type Page,
	test as base,
} from "@playwright/test";

type Section = { id: string; label: string };
type ReadingPage = {
	path: string;
	navigation: string;
	first: Section;
	middle: Section;
	last: Section;
};

const uses: ReadingPage = {
	path: "/uses",
	navigation: "What I use",
	first: { id: "languages", label: "Languages" },
	middle: { id: "development", label: "Development tools" },
	last: { id: "software", label: "Software" },
};
const about: ReadingPage = {
	path: "/about",
	navigation: "On this page",
	first: { id: "introduction", label: "Introduction" },
	middle: { id: "approach", label: "How I like to build" },
	last: { id: "toolkit", label: "My toolkit" },
};
const tolerance = 2; // Allow fractional layout coordinates and integer scroll positions.

const test = base.extend({
	page: async ({ page, baseURL }, use) => {
		const errors: string[] = [];
		const onPageError = (error: Error) => {
			if (errors.length < 10) errors.push(error.stack ?? error.message);
		};
		const onConsole = (message: ConsoleMessage) => {
			if (message.type() !== "error") return;
			if (message.text().startsWith("Failed to load resource:") && baseURL) {
				try {
					if (
						new URL(message.location().url).origin !== new URL(baseURL).origin
					)
						return;
				} catch {
					// A message without a resource URL is still an application error.
				}
			}
			if (errors.length < 10) errors.push(message.text());
		};
		page.on("pageerror", onPageError);
		page.on("console", onConsole);
		try {
			await use(page);
		} finally {
			page.off("pageerror", onPageError);
			page.off("console", onConsole);
			expect(
				errors,
				"Reading navigation must not throw page exceptions",
			).toEqual([]);
		}
	},
});

function contents(page: Page, route: ReadingPage) {
	return page.getByRole("navigation", { name: route.navigation, exact: true });
}

function readingRail(page: Page, route: ReadingPage) {
	return page.locator("[data-reading-rail]").filter({
		has: contents(page, route),
	});
}

function siteHeader(page: Page) {
	return page.getByRole("banner").filter({
		has: page.getByRole("navigation", { name: "Main navigation", exact: true }),
	});
}

async function openReadingPage(page: Page, route: ReadingPage, hash = "") {
	const response = await page.goto(`${route.path}${hash}`, {
		waitUntil: "domcontentloaded",
	});
	expect(response?.status()).toBe(200);
	await expect(
		page.getByRole("main").getByRole("heading", { level: 1 }),
	).toBeVisible();
	await expect(readingRail(page, route)).toHaveCount(1);
	await expect(contents(page, route)).toBeVisible();
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function expectScrollPosition(page: Page, top: number) {
	await expect
		.poll(() => page.evaluate((y) => Math.abs(window.scrollY - y), top), {
			message: `The document should settle at scroll position ${Math.round(top)}`,
		})
		.toBeLessThanOrEqual(tolerance);
}

async function scrollDocument(page: Page, top: number) {
	const destination = await page.evaluate((requested) => {
		const maximum = Math.max(
			0,
			document.documentElement.scrollHeight - window.innerHeight,
		);
		const y = Math.max(0, Math.min(requested, maximum));
		window.scrollTo({ top: y, left: 0, behavior: "instant" });
		return y;
	}, top);
	await expectScrollPosition(page, destination);
	return destination;
}

async function stickyPositions(page: Page, rail: Locator) {
	await scrollDocument(page, 0);
	await expect(rail).toHaveCSS("position", "sticky");
	const bounds = await rail.evaluate((element) => {
		const parent = element.parentElement;
		if (!parent) throw new Error("The reading rail needs a containing column");
		const box = element.getBoundingClientRect();
		const style = getComputedStyle(element);
		const parentStyle = getComputedStyle(parent);
		const inset = Number.parseFloat(style.top);
		if (!Number.isFinite(inset))
			throw new Error("The sticky reading rail needs a resolved top inset");
		const parentBottom =
			parent.getBoundingClientRect().bottom +
			window.scrollY -
			Number.parseFloat(parentStyle.paddingBottom) -
			Number.parseFloat(parentStyle.borderBottomWidth);
		return {
			inset,
			start: Math.max(0, box.top + window.scrollY - inset),
			end: Math.min(
				document.documentElement.scrollHeight - window.innerHeight,
				parentBottom -
					box.height -
					inset -
					Number.parseFloat(style.marginBottom),
			),
		};
	});
	const anchorOffset = await page
		.getByRole("main")
		.evaluate((element) =>
			Number.parseFloat(getComputedStyle(element).scrollMarginBlockStart),
		);
	expect(
		bounds.inset,
		"The rail and fragment destinations should share the header-aware offset",
	).toBe(anchorOffset);
	const travel = bounds.end - bounds.start;
	expect(
		travel,
		"The rail's containing column must extend far enough for it to stay sticky",
	).toBeGreaterThan(tolerance * 4);
	return {
		inset: bounds.inset,
		start: bounds.start,
		end: bounds.end,
		// Stay away from both the initial flow position and containing-block limit.
		positions: [
			bounds.start + travel / 3,
			bounds.start + (travel * 2) / 3,
		] as const,
	};
}

async function expectPinned(
	page: Page,
	rail: Locator,
	scroll: number,
	inset: number,
) {
	const destination = await scrollDocument(page, scroll);
	await expect
		.poll(
			() =>
				rail.evaluate(
					(element, top) => Math.abs(element.getBoundingClientRect().top - top),
					inset,
				),
			{
				message: "The reading rail should stay pinned while the article moves",
			},
		)
		.toBeLessThanOrEqual(tolerance);
	const headerBottom = await siteHeader(page).evaluate(
		(element) => element.getBoundingClientRect().bottom,
	);
	const box = await rail.evaluate((element) => ({
		top: element.getBoundingClientRect().top,
		bottom: element.getBoundingClientRect().bottom,
		viewportHeight: window.innerHeight,
	}));
	expect(
		box.top,
		"The pinned rail must clear the sticky header",
	).toBeGreaterThanOrEqual(headerBottom - tolerance);
	expect(
		box.bottom,
		"The rail must fit within the viewport",
	).toBeLessThanOrEqual(box.viewportHeight + tolerance);
	return destination;
}

async function expectAnchor(page: Page, route: ReadingPage, section: Section) {
	await expect(page).toHaveURL(`${route.path}#${section.id}`);
	const navigation = contents(page, route);
	const link = navigation.getByRole("link", {
		name: section.label,
		exact: true,
	});
	const href = await link.getAttribute("href");
	if (!href) throw new Error("The section link needs a destination");
	const destination = new URL(href, page.url());
	expect(destination.pathname).toBe(route.path);
	expect(destination.hash).toBe(`#${section.id}`);
	await expect(link).toHaveAttribute("aria-current", "location");
	await expect(navigation.locator('[aria-current="location"]')).toHaveCount(1);
	const headerBottom = await siteHeader(page).evaluate(
		(element) => element.getBoundingClientRect().bottom,
	);
	await expect
		.poll(
			() =>
				page.locator(`#${section.id}`).evaluate(
					(element, { headerBottom, tolerance }) => {
						const top = element.getBoundingClientRect().top;
						const documentTop = top + window.scrollY;
						const margin = Number.parseFloat(
							getComputedStyle(element).scrollMarginTop,
						);
						const maximum = Math.max(
							0,
							document.documentElement.scrollHeight - window.innerHeight,
						);
						// A final section may not have enough content below it to reach
						// the preferred anchor offset. Accept the actual document limit.
						const expectedScroll = Math.min(
							maximum,
							Math.max(0, documentTop - margin),
						);
						return {
							aligned: Math.abs(window.scrollY - expectedScroll) <= tolerance,
							clearOfHeader: top >= headerBottom - tolerance,
							startInViewport: top < window.innerHeight,
						};
					},
					{ headerBottom, tolerance },
				),
			{
				message: `${section.label} must land visibly at its anchor destination`,
			},
		)
		.toEqual({
			aligned: true,
			clearOfHeader: true,
			startInViewport: true,
		});
}

async function expectNoHorizontalOverflow(page: Page) {
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					Math.max(
						document.documentElement.scrollWidth,
						document.body.scrollWidth,
					) - document.documentElement.clientWidth,
			),
		)
		.toBeLessThanOrEqual(1);
}

async function expectVisibleKeyboardFocus(page: Page, link: Locator) {
	await expect(link).toBeFocused();
	await expect(link).toBeInViewport({ ratio: 1 });
	await expect
		.poll(() =>
			link.evaluate((element) => {
				const style = getComputedStyle(element);
				const outline =
					style.outlineStyle !== "none" &&
					Number.parseFloat(style.outlineWidth) > 0 &&
					style.outlineColor !== "rgba(0, 0, 0, 0)" &&
					style.outlineColor !== "transparent";
				return (
					element.matches(":focus-visible") &&
					(outline || style.boxShadow !== "none")
				);
			}),
		)
		.toBe(true);
	const headerBottom = await siteHeader(page).evaluate(
		(element) => element.getBoundingClientRect().bottom,
	);
	expect(
		await link.evaluate((element) => element.getBoundingClientRect().top),
	).toBeGreaterThanOrEqual(headerBottom - tolerance);
}

test("compact tool tiles disclose their descriptions by pointer and keyboard", async ({
	page,
}) => {
	await openReadingPage(page, uses);
	const summary = page
		.locator("#development summary")
		.filter({ hasText: "Bun" });
	const details = summary.locator("..");
	const description = details.locator("p");
	await expect(description).toBeHidden();
	expect(
		await details.evaluate((element) => element.getBoundingClientRect().height),
	).toBeLessThanOrEqual(72);
	await summary.click();
	await expect(details).toHaveAttribute("open", "");
	await expect(description).toBeVisible();
	await expectNoHorizontalOverflow(page);
	await summary.focus();
	await page.keyboard.press("Space");
	await expect(description).toBeHidden();
	await expect(summary).toBeFocused();
});

test("bottom-clamped anchors keep the selected section active", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Exercise the short-content desktop clamp.");
	await openReadingPage(page, uses);
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("A viewport is required");
	const height = await page.locator("#pc").evaluate((element) => {
		const top = element.getBoundingClientRect().top + window.scrollY;
		const offset = Number.parseFloat(getComputedStyle(element).scrollMarginTop);
		return Math.ceil(
			document.documentElement.scrollHeight - top + offset + 120,
		);
	});
	await page.setViewportSize({ width: viewport.width, height });
	const navigation = contents(page, uses);
	const pc = { id: "pc", label: "My PC & hardware" };
	await navigation.getByRole("link", { name: pc.label, exact: true }).click();
	await expectAnchor(page, uses, pc);
	await navigation
		.getByRole("link", { name: uses.last.label, exact: true })
		.click();
	await expectAnchor(page, uses, uses.last);
	await navigation.getByRole("link", { name: pc.label, exact: true }).click();
	await expectAnchor(page, uses, pc);
});

test.describe("smooth section scrolling", () => {
	test.use({ reducedMotion: "no-preference" });

	test("scrolls in one direction and keeps the requested item selected", async ({
		page,
	}) => {
		await openReadingPage(page, uses);
		const link = contents(page, uses).getByRole("link", {
			name: uses.last.label,
			exact: true,
		});
		await link.click({ trial: true });
		const recording = page.evaluate(
			(id) =>
				new Promise<Array<{ y: number; active: string | null }>>(
					(resolve, reject) => {
						const target = document.getElementById(id);
						if (!target) return reject(new Error("Missing scroll destination"));
						const samples: Array<{ y: number; active: string | null }> = [];
						let frames = 0;
						let settled = 0;
						const measure = () => {
							if (window.location.hash === `#${id}`) {
								const y = window.scrollY;
								const previous = samples.at(-1)?.y;
								samples.push({
									y,
									active:
										document
											.querySelector(
												'nav[aria-label="What I use"] [aria-current="location"]',
											)
											?.getAttribute("href") ?? null,
								});
								const margin = Number.parseFloat(
									getComputedStyle(target).scrollMarginTop,
								);
								const end = Math.min(
									document.documentElement.scrollHeight - window.innerHeight,
									Math.max(0, target.getBoundingClientRect().top + y - margin),
								);
								settled =
									Math.abs(y - end) <= 2 &&
									previous !== undefined &&
									Math.abs(previous - y) < 0.5
										? settled + 1
										: 0;
								if (settled >= 3) return resolve(samples);
							}
							if (++frames > 400)
								return reject(new Error("Section scrolling did not settle"));
							requestAnimationFrame(measure);
						};
						requestAnimationFrame(measure);
					},
				),
			uses.last.id,
		);
		await link.click();
		const samples = await recording;
		const selected = samples.findIndex((sample) =>
			sample.active?.endsWith(`#${uses.last.id}`),
		);
		expect(selected).toBeGreaterThanOrEqual(0);
		expect(
			samples
				.slice(selected)
				.every((sample) => sample.active?.endsWith(`#${uses.last.id}`)),
		).toBe(true);
		expect(
			new Set(samples.map((sample) => Math.round(sample.y))).size,
		).toBeGreaterThan(2);
		for (let index = 1; index < samples.length; index++) {
			const current = samples[index];
			const previous = samples[index - 1];
			if (!current || !previous) throw new Error("Missing scroll sample");
			expect(current.y).toBeGreaterThanOrEqual(previous.y - 1);
		}
		await expectAnchor(page, uses, uses.last);
	});
});

test("rendered Markdown fragment links preserve pointer and keyboard history entries", async ({
	page,
}) => {
	await page.goto("/projects/keyzori");
	await page.evaluate(() => document.fonts.ready.then(() => undefined));
	const targets = await page
		.getByRole("article", { name: "About Keyzori" })
		.evaluate((article) => {
			const headings = [
				...article.querySelectorAll<HTMLHeadingElement>("h2[id]"),
			];
			const first = headings[0];
			const last = headings.at(-1);
			if (!first || !last) throw new Error("Project sections are required");
			const link = document.createElement("a");
			link.href = `#${last.id}`;
			link.textContent = "Jump to the final section";
			first.insertAdjacentElement("afterend", link);
			return { first: first.id, last: last.id };
		});
	const first = page.locator(`#${targets.first}`);
	const destination = await first.evaluate(
		(element) =>
			element.getBoundingClientRect().top +
			window.scrollY -
			Number.parseFloat(getComputedStyle(element).scrollMarginTop),
	);
	const link = page.getByRole("link", {
		name: "Jump to the final section",
		exact: true,
	});
	for (const activation of ["pointer", "keyboard"]) {
		await test.step(activation, async () => {
			await scrollDocument(page, destination);
			if (activation === "keyboard") {
				await link.focus();
				await expect(link).toBeFocused();
			} else {
				await link.click({ trial: true });
			}
			const before = await page.evaluate(() => window.scrollY);
			if (activation === "keyboard") await page.keyboard.press("Enter");
			else await link.click();
			await expect(page).toHaveURL(`/projects/keyzori#${targets.last}`);
			await page.goBack();
			await expect(page).toHaveURL("/projects/keyzori");
			await expectScrollPosition(page, before);
		});
	}
});

test("Uses stays pinned through the reading column and keeps a short rail keyboard-scrollable", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Sticky rails belong to the desktop layout.");
	await openReadingPage(page, uses);
	const rail = readingRail(page, uses);
	const bounds = await stickyPositions(page, rail);
	for (const position of bounds.positions) {
		await expectPinned(page, rail, position, bounds.inset);
	}

	// A hash-only implementation would pass link clicks but fail ordinary reading.
	const navigation = contents(page, uses);
	const developmentScroll = await page
		.locator(`#${uses.middle.id}`)
		.evaluate(
			(element) =>
				element.getBoundingClientRect().top +
				window.scrollY -
				Number.parseFloat(getComputedStyle(element).scrollMarginBlockStart),
		);
	await scrollDocument(page, developmentScroll);
	await expect(
		navigation.getByRole("link", { name: uses.middle.label, exact: true }),
	).toHaveAttribute("aria-current", "location");
	await expect(page).toHaveURL(uses.path);
	await scrollDocument(page, 0);
	await expect(
		navigation.getByRole("link", { name: uses.first.label, exact: true }),
	).toHaveAttribute("aria-current", "location");

	const viewport = page.viewportSize();
	if (!viewport) throw new Error("This test requires a configured viewport");
	const contentHeight = await rail.evaluate((element) => element.scrollHeight);
	// Force real vertical overflow using the rail's content size, not a guessed
	// laptop height or a fixed scroll distance.
	await page.setViewportSize({
		width: viewport.width,
		height: Math.ceil(bounds.inset + contentHeight / 2),
	});
	const shortBounds = await stickyPositions(page, rail);
	const pinnedScroll = await expectPinned(
		page,
		rail,
		shortBounds.positions[0],
		shortBounds.inset,
	);
	await expect
		.poll(() =>
			rail.evaluate((element) => element.scrollHeight - element.clientHeight),
		)
		.toBeGreaterThan(tolerance);
	const links = contents(page, uses).getByRole("link");
	await links.first().focus();
	await expect(links.first()).toBeInViewport({ ratio: 1 });
	const count = await links.count();
	for (let index = 1; index < count; index++) {
		await page.keyboard.press("Tab");
		await expectVisibleKeyboardFocus(page, links.nth(index));
	}
	expect(await rail.evaluate((element) => element.scrollTop)).toBeGreaterThan(
		0,
	);
	await expectScrollPosition(page, pinnedScroll);
	await expectNoHorizontalOverflow(page);
});

test("About pins the profile and right navigation in the wide layout", async ({
	page,
	isMobile,
}) => {
	test.skip(isMobile, "Sticky rails belong to the desktop layout.");
	await openReadingPage(page, about);
	const rail = readingRail(page, about);
	const profile = page.locator("[data-profile-rail]");
	const bounds = await stickyPositions(page, rail);
	const profileBounds = await stickyPositions(page, profile);
	const start = Math.max(bounds.start, profileBounds.start);
	const end = Math.min(bounds.end, profileBounds.end);
	expect(end - start).toBeGreaterThan(8);
	for (const position of [
		start + (end - start) / 3,
		start + ((end - start) * 2) / 3,
	]) {
		await expectPinned(page, rail, position, bounds.inset);
		await expectPinned(page, profile, position, profileBounds.inset);
		const layout = await page.evaluate(() => ({
			railLeft:
				document.querySelector("[data-reading-rail]")?.getBoundingClientRect()
					.left ?? 0,
			contentRight:
				document.getElementById("introduction")?.getBoundingClientRect()
					.right ?? 0,
		}));
		expect(layout.railLeft).toBeGreaterThan(layout.contentRight);
	}
});

for (const route of [uses, about]) {
	test(`${route.path} supports direct fragments, native TOC links, and fragment history`, async ({
		page,
	}) => {
		await openReadingPage(page, route, `#${route.middle.id}`);
		await expectAnchor(page, route, route.middle);
		const navigation = contents(page, route);
		const lastLink = navigation.getByRole("link", {
			name: route.last.label,
			exact: true,
		});
		// On mobile the TOC has scrolled away. Actionability may bring it back
		// into view; Back must restore that real pre-click scroll position.
		await lastLink.click({ trial: true });
		const beforeClick = await page.evaluate(() => window.scrollY);
		await lastLink.click();
		await expectAnchor(page, route, route.last);
		const afterClick = await page.evaluate(() => window.scrollY);

		await page.goBack();
		await expect(page).toHaveURL(`${route.path}#${route.middle.id}`);
		await expectScrollPosition(page, beforeClick);
		await page.goForward();
		await expectAnchor(page, route, route.last);
		await expectScrollPosition(page, afterClick);

		for (const section of [route.first, route.middle]) {
			await navigation
				.getByRole("link", { name: section.label, exact: true })
				.click();
			await expectAnchor(page, route, section);
		}
	});
}

test("reading navigation wraps in normal flow through 800px and sticks from 801px without overflow", async ({
	page,
	isMobile,
}) => {
	const viewport = page.viewportSize();
	if (!viewport) throw new Error("This test requires a configured viewport");
	for (const width of isMobile ? [800, 320] : [801]) {
		await page.setViewportSize({ width, height: viewport.height });
		for (const route of [uses, about]) {
			await test.step(`${route.path} at ${width}px`, async () => {
				await openReadingPage(page, route);
				const rail = readingRail(page, route);
				await expectNoHorizontalOverflow(page);
				if (width >= 801) {
					const bounds = await stickyPositions(page, rail);
					for (const position of bounds.positions) {
						await expectPinned(page, rail, position, bounds.inset);
					}
					await expectNoHorizontalOverflow(page);
					return;
				}

				await expect(rail).toHaveCSS("position", /^(static|relative)$/);
				const links = contents(page, route).getByRole("link");
				const rows = await links.evaluateAll((elements) => {
					const tops: number[] = [];
					for (const element of elements) {
						const top = element.getBoundingClientRect().top;
						if (!tops.some((existing) => Math.abs(existing - top) <= 2))
							tops.push(top);
					}
					return tops.length;
				});
				if (width === 800) expect(rows).toBeLessThan(await links.count());
				else expect(rows).toBeGreaterThan(1);
				const initial = await rail.evaluate((element) => ({
					top: element.getBoundingClientRect().top,
					height: element.getBoundingClientRect().height,
				}));
				const scrolled = await scrollDocument(
					page,
					initial.top + initial.height / 2,
				);
				expect(scrolled).toBeGreaterThan(0);
				expect(
					Math.abs(
						(await rail.evaluate(
							(element) => element.getBoundingClientRect().top,
						)) -
							(initial.top - scrolled),
					),
					"Mobile reading navigation should move with the document",
				).toBeLessThanOrEqual(tolerance);
				await expectNoHorizontalOverflow(page);
			});
		}
	}
});

test("keyboard route changes focus main while TOC navigation and history retain their scroll destinations", async ({
	page,
}) => {
	await openReadingPage(page, about);
	const mainNavigation = page.getByRole("navigation", {
		name: "Main navigation",
		exact: true,
	});
	const usesLink = mainNavigation.getByRole("link", {
		name: "Uses",
		exact: true,
	});
	await usesLink.focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL("/uses");
	const main = page.getByRole("main");
	await expect(main).toBeFocused();
	await expect(usesLink).toHaveAttribute("aria-current", "page");
	await expect(mainNavigation.locator('[aria-current="page"]')).toHaveCount(1);
	await expectScrollPosition(page, 0);
	await page.evaluate(() => document.fonts.ready.then(() => undefined));

	const navigation = contents(page, uses);
	await page.keyboard.press("Tab");
	await expectVisibleKeyboardFocus(
		page,
		navigation.getByRole("link", { name: uses.first.label, exact: true }),
	);
	await page.keyboard.press("Tab");
	const development = navigation.getByRole("link", {
		name: uses.middle.label,
		exact: true,
	});
	await expectVisibleKeyboardFocus(page, development);
	await page.keyboard.press("Enter");
	await expectAnchor(page, uses, uses.middle);
	await expect(main).not.toBeFocused();
	const anchoredScroll = await page.evaluate(() => window.scrollY);

	await mainNavigation
		.getByRole("link", { name: "About", exact: true })
		.click();
	await expect(page).toHaveURL("/about");
	await expect(main).toBeFocused();
	await expectScrollPosition(page, 0);
	await page.goBack();
	await expect(main).toBeFocused();
	await expectAnchor(page, uses, uses.middle);
	await expectScrollPosition(page, anchoredScroll);
	await page.goForward();
	await expect(page).toHaveURL("/about");
	await expect(main).toBeFocused();
	await expectScrollPosition(page, 0);
});
