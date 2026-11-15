import { afterAll, describe, expect, test } from "bun:test";
import { decodeHTML, decodeHTMLAttribute } from "entities";
import { createContentService } from "../app/content.server";
import type { ClientAssets, ContentService } from "../app/lib/content-context";
import config from "../config";
import { parseNote } from "./notes";
import { startServer } from "./server.tsx";

// `bun run test` builds the browser assets and native server bundle first.
const assets: ClientAssets = await Bun.file(
	"./build/client/manifest.json",
).json();
const content = createContentService(assets);
const server = await startServer({
	port: 0,
	production: true,
	assets,
	content,
});
afterAll(async () => {
	await server.stop(true);
});

const origin = server.url.origin;
const paths = [
	"/",
	"/about",
	"/uses",
	"/projects",
	...config.projects.list.map((project) => `/projects/${project.slug}`),
	"/notes",
	...(await content.notes()).map((note) => `/notes/${note.slug}`),
	"/contact",
];

const request = (path: string, init?: RequestInit, target = server) =>
	fetch(new URL(path, target.url), { redirect: "manual", ...init });

interface HtmlElement {
	tag: string;
	attributes: Record<string, string>;
	text: string;
}

async function select(html: string, selector: string): Promise<HtmlElement[]> {
	const elements: HtmlElement[] = [];
	const active = new Set<HtmlElement>();
	await new HTMLRewriter()
		.on(selector, {
			element(element) {
				const match: HtmlElement = {
					tag: element.tagName,
					attributes: Object.fromEntries(
						[...element.attributes].map(([name, value]) => [
							name,
							decodeHTMLAttribute(value),
						]),
					),
					text: "",
				};
				elements.push(match);
				if (element.canHaveContent) {
					active.add(match);
					element.onEndTag(() => {
						active.delete(match);
					});
				}
			},
			text(chunk) {
				for (const match of active) match.text += chunk.text;
			},
		})
		.transform(new Response(html))
		.text();
	return elements.map((element) => ({
		...element,
		text: decodeHTML(element.text).replace(/\s+/g, " ").trim(),
	}));
}

async function expectDocument(html: string, path: string) {
	const titles = await select(html, "title");
	const descriptions = await select(html, 'meta[name="description"]');
	const canonicals = await select(html, 'link[rel="canonical"]');
	const headings = await select(html, "h1");
	expect(titles).toHaveLength(1);
	expect(titles[0]?.text).toBeTruthy();
	expect(descriptions).toHaveLength(1);
	expect(descriptions[0]?.attributes.content).toBeTruthy();
	expect(canonicals).toHaveLength(1);
	expect(canonicals[0]?.attributes.href).toBe(
		new URL(path, config.site.url).href,
	);
	expect(headings).toHaveLength(1);
	expect(headings[0]?.text).toBeTruthy();
	expect(
		await select(
			html,
			'head title, head meta[name="description"], head link[rel="canonical"]',
		),
	).toHaveLength(3);
	expect(html).not.toMatch(/%%[A-Z_]+%%/);
	return titles[0]?.text ?? "";
}

async function expectActiveNavigation(html: string, path: string) {
	const current = await select(html, 'nav a[aria-current="page"]');
	expect(current.length).toBeGreaterThan(0);
	// Desktop/mobile navigation may each expose the same current destination.
	expect([...new Set(current.map((link) => link.attributes.href))]).toEqual([
		path,
	]);
}

describe("React SSR portfolio", () => {
	test("every published URL opens directly with unique native metadata and a single page heading", async () => {
		const titles = new Set<string>();
		for (const path of paths) {
			const response = await request(path);
			expect(response.status, path).toBe(200);
			expect(response.headers.get("content-type"), path).toContain("text/html");
			const html = await response.text();
			const title = await expectDocument(html, path);
			expect(titles.has(title), path).toBe(false);
			titles.add(title);
			const parent = path.startsWith("/projects/")
				? "/projects"
				: path.startsWith("/notes/")
					? "/notes"
					: path;
			await expectActiveNavigation(html, parent);
		}
	});

	test("SSR responses are uncacheable and HEAD retains document headers without a body", async () => {
		for (const [path, status] of [
			["/about", 200],
			["/projects", 200],
			["/projects/does-not-exist", 404],
		] as const) {
			const headers = { "if-none-match": '"obsolete-html-validator"' };
			const response = await request(path, { headers });
			expect(response.status, path).toBe(status);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(response.headers.get("etag")).toBeNull();
			expect(response.headers.get("content-type")).toContain("text/html");
			expect(response.headers.get("x-content-type-options")).toBe("nosniff");
			expect(response.headers.get("referrer-policy")).toBe(
				"strict-origin-when-cross-origin",
			);
			expect(await response.text()).not.toBe("");

			const head = await request(path, { method: "HEAD", headers });
			expect(head.status, path).toBe(status);
			for (const header of [
				"content-type",
				"cache-control",
				"x-content-type-options",
				"referrer-policy",
			]) {
				expect(head.headers.get(header), `${path}: ${header}`).toBe(
					response.headers.get(header),
				);
			}
			expect(await head.text()).toBe("");
		}
	});

	test("missing pages, projects, and notes render a real noindex 404 document", async () => {
		for (const path of [
			"/another-missing-page",
			"/projects/does-not-exist",
			"/notes/does-not-exist",
		]) {
			const response = await request(path);
			expect(response.status, path).toBe(404);
			expect(response.headers.get("cache-control")).toBe("no-store");
			expect(response.headers.get("content-type")).toContain("text/html");
			const html = await response.text();
			await expectDocument(html, path);
			const robots = await select(html, 'head meta[name="robots"]');
			expect(robots).toHaveLength(1);
			expect(robots[0]?.attributes.content?.split(/[,\s]+/)).toContain(
				"noindex",
			);
			expect(await select(html, 'nav a[aria-current="page"]')).toHaveLength(0);
			expect((await select(html, 'a[href="/"]')).length).toBeGreaterThan(0);
		}
	});

	test("legacy and trailing-slash redirects preserve query strings", async () => {
		for (const [from, to] of [
			["/index.html", "/"],
			["/work", "/projects"],
			["/index.html?from=legacy&tag=a%26b", "/?from=legacy&tag=a%26b"],
			["/work?from=legacy&tag=a%26b", "/projects?from=legacy&tag=a%26b"],
			["/about/?from=home", "/about?from=home"],
			["/projects/?from=home", "/projects?from=home"],
		] as const) {
			const response = await request(from);
			expect(response.status, from).toBe(308);
			expect(response.headers.get("location"), from).toBe(to);
			await response.text();
		}
	});

	test("only Contact server-renders the labeled, verification-gated message form", async () => {
		for (const path of paths) {
			const html = await (await request(path)).text();
			const forms = await select(html, 'form[action="/api/contact"]');
			expect(forms, path).toHaveLength(path === "/contact" ? 1 : 0);
			if (path !== "/contact") continue;

			const form = forms[0];
			if (!form) throw new Error("Missing contact form");
			expect(form.attributes.method?.toLowerCase()).toBe("post");
			const labels = await select(html, "form label");
			const fields = await select(
				html,
				"form input[name], form textarea[name]",
			);
			for (const [name, tag, maximum] of [
				["name", "input", "80"],
				["email", "input", "254"],
				["message", "textarea", "3000"],
			] as const) {
				const field = fields.find(
					(element) => element.attributes.name === name,
				);
				expect(field, name).toBeDefined();
				if (!field) throw new Error(`Missing ${name} field`);
				expect(field.tag).toBe(tag);
				expect(Object.hasOwn(field.attributes, "required")).toBe(true);
				expect(field.attributes.maxlength).toBe(maximum);
				expect(field.attributes.id).toBeTruthy();
				const label = labels.find(
					(element) => element.attributes.for === field.attributes.id,
				);
				expect(label?.text, `${name} label`).toBeTruthy();
			}
			expect(
				fields.find((field) => field.attributes.name === "email")?.attributes
					.type,
			).toBe("email");

			const elementsById = new Map(
				(await select(html, "[id]")).map((element) => [
					element.attributes.id,
					element,
				]),
			);
			const nameReferences = form.attributes["aria-labelledby"]?.split(/\s+/);
			expect(nameReferences?.length).toBeGreaterThan(0);
			for (const id of nameReferences ?? []) {
				expect(elementsById.get(id)?.text).toBeTruthy();
			}
			const descriptions = form.attributes["aria-describedby"]?.split(/\s+/);
			expect(descriptions?.length).toBeGreaterThan(0);
			for (const id of descriptions ?? []) {
				expect(elementsById.has(id), `form description ${id}`).toBe(true);
			}
			const submit = await select(html, 'form button[type="submit"]');
			expect(submit).toHaveLength(1);
			expect(submit[0]?.text).toMatch(/send message/i);
			expect(Object.hasOwn(submit[0]?.attributes ?? {}, "disabled")).toBe(true);
			const statuses = await select(
				html,
				'[role="status"][aria-live="polite"]',
			);
			expect(
				statuses.some((status) =>
					descriptions?.includes(status.attributes.id ?? ""),
				),
			).toBe(true);
			expect((await select(html, "form noscript"))[0]?.text).toMatch(
				/JavaScript/,
			);
		}
	});

	test("internal links, compiled assets, media, and section anchors resolve", async () => {
		const responses = new Map<
			string,
			{ status: number; contentType: string; body: string }
		>();
		const load = async (path: string) => {
			let result = responses.get(path);
			if (!result) {
				const response = await request(path);
				result = {
					status: response.status,
					contentType: response.headers.get("content-type") ?? "",
					body: await response.text(),
				};
				responses.set(path, result);
			}
			return result;
		};
		for (const path of paths) {
			const page = await load(path);
			const references = await select(
				page.body,
				"a[href], link[href], script[src], img[src], source[src], video[poster], use[href], image[href]",
			);
			for (const element of references) {
				const reference =
					element.attributes.href ??
					element.attributes.src ??
					element.attributes.poster;
				if (!reference) continue;
				const url = new URL(reference, new URL(path, origin));
				if (url.origin !== origin) continue;
				const target = await load(`${url.pathname}${url.search}`);
				const message = `${path} → ${reference}`;
				expect(target.status, message).toBe(200);
				if (element.tag === "script") {
					expect(target.contentType, message).toMatch(/javascript/);
				}
				if (element.attributes.rel?.split(/\s+/).includes("stylesheet")) {
					expect(target.contentType, message).toContain("text/css");
				}
				if (element.tag === "img") {
					expect(target.contentType, message).toMatch(/^image\//);
				}
				if (url.hash) {
					const ids = (await select(target.body, "[id]")).map(
						(node) => node.attributes.id,
					);
					expect(ids, message).toContain(decodeURIComponent(url.hash.slice(1)));
				}
			}
		}
	});

	test("the note route renders a parsed fixture without publishing it", async () => {
		const fixture = await parseNote(
			await Bun.file("./src/fixtures/markdown.md").text(),
			"ssr-test-fixture",
		);
		if (!fixture) throw new Error("Expected a published fixture");
		const fixtureContent: ContentService = {
			...content,
			async note(slug, signal) {
				signal?.throwIfAborted();
				return slug === fixture.slug ? fixture : content.note(slug, signal);
			},
		};
		const fixtureServer = await startServer({
			port: 0,
			production: true,
			assets,
			content: fixtureContent,
		});
		try {
			const path = `/notes/${fixture.slug}`;
			const response = await request(path, undefined, fixtureServer);
			expect(response.status).toBe(200);
			const html = await response.text();
			expect(await expectDocument(html, path)).toBe(
				`${fixture.title} — ${config.profile.name}`,
			);
			expect((await select(html, "h1"))[0]?.text).toBe(fixture.title);
			expect(
				(await select(html, 'head meta[name="description"]'))[0]?.attributes
					.content,
			).toBe(fixture.description);
			await expectActiveNavigation(html, "/notes");
			for (const tag of [
				"strong",
				"em",
				"del",
				"ol",
				"ul",
				"blockquote",
				"table",
				"pre",
			]) {
				expect(
					(await select(html, `article ${tag}`)).length,
					tag,
				).toBeGreaterThan(0);
			}
			const headings = await select(
				html,
				"article h2, article h3, article h4, article h5, article h6",
			);
			for (const heading of fixture.headings) {
				const rendered = headings.find(
					(element) => element.attributes.id === heading.id,
				);
				expect(rendered?.tag).toBe(`h${heading.level}`);
				expect(rendered?.text).toBe(heading.text);
			}
			const navigation = await select(html, "nav a[href]");
			for (const heading of fixture.headings.filter(
				(entry) => entry.level <= 3,
			)) {
				expect(
					navigation.some((link) => {
						if (!link.attributes.href) return false;
						const target = new URL(link.attributes.href, fixtureServer.url);
						return (
							target.pathname === path &&
							decodeURIComponent(target.hash.slice(1)) === heading.id
						);
					}),
					heading.text,
				).toBe(true);
			}
			const code = await select(html, "article pre code");
			expect(
				code.some((element) =>
					element.text.includes("<script>This is code, not HTML.</script>"),
				),
			).toBe(true);
			expect(await select(html, "article script")).toHaveLength(0);
			const unmodified = await request(path);
			expect(unmodified.status).toBe(404);
			await unmodified.text();
		} finally {
			await fixtureServer.stop(true);
		}
	});

	test("the removed introductory note is not published or discoverable", async () => {
		const response = await request("/notes/keeping-this-site-simple");
		expect(response.status).toBe(404);
		await response.text();
		expect(await (await request("/notes")).text()).not.toContain(
			"Keeping this site simple",
		);
		expect(await (await request("/sitemap.xml")).text()).not.toContain(
			"keeping-this-site-simple",
		);
	});

	test("sitemap and robots expose exactly the published canonical pages", async () => {
		const response = await request("/sitemap.xml");
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/xml");
		const locations = (await select(await response.text(), "url loc")).map(
			(element) => element.text,
		);
		expect(locations.sort()).toEqual(
			paths.map((path) => new URL(path, config.site.url).href).sort(),
		);
		expect(new Set(locations).size).toBe(locations.length);
		expect(locations.some((url) => url.endsWith("/404"))).toBe(false);
		expect(locations.some((url) => url.includes("ssr-test-fixture"))).toBe(
			false,
		);
		const robots = await request("/robots.txt");
		expect(robots.status).toBe(200);
		expect(robots.headers.get("content-type")).toContain("text/plain");
		expect(await robots.text()).toContain(
			`Sitemap: ${new URL("/sitemap.xml", config.site.url).href}`,
		);
	});
});
