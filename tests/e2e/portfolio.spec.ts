import {
	type ConsoleMessage,
	expect,
	type Page,
	test as base,
} from "@playwright/test";

const navigation = [
	{ label: "Home", path: "/" },
	{ label: "About", path: "/about" },
	{ label: "Uses", path: "/uses" },
	{ label: "Projects", path: "/projects" },
	{ label: "Notes", path: "/notes" },
	{ label: "Contact", path: "/contact" },
] as const;

const corePages = [
	{ path: "/", title: /Snibbi/i },
	{ path: "/about", title: /About.*Snibbi/i },
	{ path: "/uses", title: /Uses.*Snibbi/i },
	{ path: "/projects", title: /Projects.*Snibbi/i },
	{ path: "/projects/keyzori", title: /Keyzori.*Snibbi/i },
	{ path: "/projects/bamu", title: /Bamu.*Snibbi/i },
	{ path: "/notes", title: /Notes.*Snibbi/i },
] as const;

function isExternalResourceFailure(
	message: ConsoleMessage,
	baseURL: string | undefined,
) {
	if (!baseURL || !message.text().startsWith("Failed to load resource:"))
		return false;
	try {
		const source = new URL(message.location().url);
		return (
			(source.protocol === "https:" || source.protocol === "http:") &&
			source.origin !== new URL(baseURL).origin
		);
	} catch {
		return false;
	}
}

const test = base.extend({
	page: async ({ page, baseURL }, use) => {
		const errors: string[] = [];
		const onPageError = (error: Error) =>
			errors.push(error.stack ?? error.message);
		const onConsole = (message: ConsoleMessage) => {
			if (message.type() !== "error") return;
			// Remote image/font outages are outside this suite. App resource failures,
			// console errors, hydration errors, and all uncaught exceptions still fail.
			if (isExternalResourceFailure(message, baseURL)) return;
			errors.push(`${message.location().url}: ${message.text()}`);
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
				"Pages must not emit JavaScript or app console errors",
			).toEqual([]);
		}
	},
});

async function expectPage(page: Page, path: string, title: RegExp) {
	await expect(page).toHaveURL(path);
	await expect(page).toHaveTitle(title);
	await expect(
		page.getByRole("main").getByRole("heading", { level: 1 }),
	).toBeVisible();
}

async function openPage(page: Page, path: string, title: RegExp) {
	const response = await page.goto(path, { waitUntil: "domcontentloaded" });
	expect(response?.status(), `${path} should serve a successful document`).toBe(
		200,
	);
	await expectPage(page, path, title);
}

async function expectNoHorizontalOverflow(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(
					() =>
						Math.max(
							document.documentElement.scrollWidth,
							document.body.scrollWidth,
						) - document.documentElement.clientWidth,
				),
			{ message: `${new URL(page.url()).pathname} should fit the viewport` },
		)
		.toBeLessThanOrEqual(1);
}

test("main navigation follows real links and supports browser history", async ({
	page,
}) => {
	await openPage(page, "/", /Snibbi/i);
	await expect(
		page.getByRole("main").getByRole("heading", { level: 1, name: /Snibbi/i }),
	).toBeVisible();
	const nav = page.getByRole("navigation", { name: "Main navigation" });
	await expect(nav.getByRole("link")).toHaveCount(navigation.length);
	for (const { label, path } of navigation) {
		const link = nav.getByRole("link", { name: label, exact: true });
		await expect(link).toBeVisible();
		await expect(link).toHaveAttribute("href", path);
	}

	// Check Contact's destination above without loading its live verification.
	for (const label of ["About", "Uses", "Projects", "Notes", "Home"]) {
		const destination = navigation.find((entry) => entry.label === label);
		if (!destination) throw new Error(`Unknown navigation item: ${label}`);
		await test.step(`Navigate to ${label}`, async () => {
			const link = nav.getByRole("link", { name: label, exact: true });
			await link.click();
			await expectPage(
				page,
				destination.path,
				label === "Home" ? /Snibbi/i : new RegExp(`${label}.*Snibbi`, "i"),
			);
			await expect(link).toHaveAttribute("aria-current", "page");
			await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
		});
	}
	await page.goBack({ waitUntil: "domcontentloaded" });
	await expectPage(page, "/notes", /Notes.*Snibbi/i);
	await page.goForward({ waitUntil: "domcontentloaded" });
	await expectPage(page, "/", /Snibbi/i);
});

test("core pages and project URLs load directly without horizontal overflow", async ({
	page,
}) => {
	for (const { path, title } of corePages) {
		await test.step(`Open ${path} directly`, async () => {
			await openPage(page, path, title);
			await expectNoHorizontalOverflow(page);
		});
	}
	const main = page.getByRole("main");
	await expect(main.getByText(/No notes published just yet\./i)).toBeVisible();
	await expect(main.getByRole("article")).toHaveCount(0);
});

test("project cards open their write-ups and return to the project list", async ({
	page,
}) => {
	await openPage(page, "/projects", /Projects.*Snibbi/i);
	for (const { slug, title } of [
		{ slug: "keyzori", title: "Keyzori" },
		{ slug: "bamu", title: "Bamu" },
	]) {
		await test.step(`Read ${title}`, async () => {
			await page
				.getByRole("main")
				.getByRole("link", { name: new RegExp(`^${title}$`, "i") })
				.click();
			await expectPage(
				page,
				`/projects/${slug}`,
				new RegExp(`${title}.*Snibbi`, "i"),
			);
			await expect(
				page.getByRole("heading", {
					level: 1,
					name: new RegExp(`^${title}$`, "i"),
				}),
			).toBeVisible();
			await expect(
				page.getByRole("article", {
					name: new RegExp(`^About ${title}$`, "i"),
				}),
			).toContainText(/\S/);
			await page
				.getByRole("link", { name: "All projects", exact: true })
				.click();
			await expectPage(page, "/projects", /Projects.*Snibbi/i);
		});
	}
});

test("mobile navigation is icon-only and accessible through the 800px boundary", async ({
	page,
	isMobile,
}) => {
	test.skip(
		!isMobile,
		"Mobile breakpoints are exercised by the mobile project.",
	);
	for (const width of [320, 800]) {
		await test.step(`${width}px viewport`, async () => {
			await page.setViewportSize({ width, height: 900 });
			await openPage(page, "/", /Snibbi/i);
			const nav = page.getByRole("navigation", { name: "Main navigation" });
			for (const { label } of navigation) {
				const link = nav.getByRole("link", { name: label, exact: true });
				await expect(link).toHaveAccessibleName(label);
				await expect(link).toBeInViewport({ ratio: 1 });
				await expect(link.locator("svg, img").first()).toBeVisible();
				await expect
					.poll(
						() =>
							link.getByText(label, { exact: true }).evaluateAll((elements) =>
								elements.every((element) => {
									const style = getComputedStyle(element);
									const box = element.getBoundingClientRect();
									return (
										style.display === "none" ||
										style.visibility === "hidden" ||
										(box.width <= 1 && box.height <= 1)
									);
								}),
							),
						{ message: `${label} should have no visible text at ${width}px` },
					)
					.toBe(true);
			}
			await expectNoHorizontalOverflow(page);
			await openPage(page, "/projects/keyzori", /Keyzori.*Snibbi/i);
			await expectNoHorizontalOverflow(page);
		});
	}
});
