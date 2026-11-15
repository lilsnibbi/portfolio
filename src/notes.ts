import { join } from "node:path";

export interface NoteHeading {
	id: string;
	level: number;
	text: string;
}

export interface Note {
	slug: string;
	title: string;
	description: string;
	date: string;
	tag: string;
	html: string;
	headings: NoteHeading[];
	readTime: number;
}

function isSafeUrl(value: string, image = false) {
	try {
		const url = new URL(value, "https://portfolio.local/");
		return (
			image ? ["https:", "http:"] : ["https:", "http:", "mailto:", "tel:"]
		).includes(url.protocol);
	} catch {
		return false;
	}
}

/** CommonMark + GFM, rendered to ordinary HTML on the server. */
export async function renderMarkdown(
	markdown: string,
	headingNamespace = "note",
) {
	const options = {
		tables: true,
		strikethrough: true,
		tasklists: true,
		autolinks: true,
		headings: { ids: true },
		noHtmlBlocks: true,
		noHtmlSpans: true,
	};
	const generated = Bun.markdown.html(markdown, options);
	const headings: NoteHeading[] = [];
	const anchors = new Map<string, string>();
	const usedIds = new Set<string>();
	// The shared page header already supplies the page's h1.
	const headingOffset = /<h1\b/.test(generated) ? 1 : 0;
	// The parser supplies decoded plain text, including formatted heading labels.
	Bun.markdown.render(
		markdown,
		{
			heading(text, metadata) {
				const originalId = metadata.id ?? "section";
				const base = `${headingNamespace}-${originalId}`;
				let id = base;
				let suffix = 1;
				while (usedIds.has(id)) id = `${base}-${suffix++}`;
				usedIds.add(id);
				if (!anchors.has(originalId)) anchors.set(originalId, id);
				headings.push({
					id,
					level: Math.min(6, metadata.level + headingOffset),
					text: text.replace(/\s+/g, " ").trim(),
				});
				return "";
			},
		},
		options,
	);
	let tableIndex = 0;
	let headingIndex = 0;

	const html = await new HTMLRewriter()
		.on("h1, h2, h3, h4, h5, h6", {
			element(element) {
				const heading = headings[headingIndex++];
				if (!heading) return;
				element.tagName = `h${heading.level}`;
				element.setAttribute("id", heading.id);
			},
		})
		.on("table", {
			element(element) {
				element.before(
					`<div class="table-scroll" role="region" aria-label="Table ${++tableIndex}" tabindex="0">`,
					{ html: true },
				);
				element.after("</div>", { html: true });
			},
		})
		.on("pre", {
			element(element) {
				element.setAttribute("tabindex", "0");
				element.setAttribute("aria-label", "Code example");
			},
		})
		.on("pre code", {
			element(element) {
				const language = element
					.getAttribute("class")
					?.match(/(?:^|\s)language-([^\s]+)/)?.[1];
				if (language) element.setAttribute("data-language", language);
			},
		})
		.on("img", {
			element(element) {
				if (!isSafeUrl(element.getAttribute("src") ?? "", true)) {
					element.replace(element.getAttribute("alt") ?? "");
					return;
				}
				element.setAttribute("loading", "lazy");
				element.setAttribute("decoding", "async");
			},
		})
		.on("a", {
			element(element) {
				const href = element.getAttribute("href") ?? "";
				if (!isSafeUrl(href)) {
					element.removeAttribute("href");
					return;
				}
				if (href.startsWith("#")) {
					let fragment = href.slice(1);
					try {
						fragment = decodeURIComponent(fragment);
					} catch {
						// Keep a literal fragment if it wasn't URI-encoded.
					}
					const id = anchors.get(fragment);
					if (id) element.setAttribute("href", `#${id}`);
				}
			},
		})
		.transform(new Response(generated))
		.text();

	return { html, headings };
}

export async function parseNote(
	source: string,
	slug: string,
): Promise<Note | null> {
	const fail = (message: string): never => {
		throw new Error(`Note "${slug}.md": ${message}`);
	};
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		fail("use a lowercase, hyphen-separated filename");
	}
	const match = source.match(
		/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/,
	);
	if (!match) return fail("add YAML front matter between --- lines");
	const metadata = Bun.YAML.parse(match[1] ?? "");
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
		fail("front matter must be a YAML mapping");
	}
	const fields = metadata as Record<string, unknown>;
	if (fields.draft !== undefined && typeof fields.draft !== "boolean") {
		fail("draft must be true or false");
	}
	if (fields.draft === true) return null;
	const required = (key: string) => {
		const value = fields[key];
		if (typeof value !== "string" || !value.trim()) {
			return fail(`"${key}" must be a non-empty string`);
		}
		return value.trim();
	};
	const title = required("title");
	const description = required("description");
	const date = required("date");
	const parsedDate = new Date(`${date}T00:00:00Z`);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
		!Number.isFinite(parsedDate.getTime()) ||
		parsedDate.toISOString().slice(0, 10) !== date
	) {
		fail('"date" must be a valid YYYY-MM-DD date');
	}
	const tag = fields.tag === undefined ? "Notes" : required("tag");
	const body = (match[2] ?? "").trim();
	if (!body) fail("add some Markdown content after the front matter");
	const rendered = await renderMarkdown(body);
	const text = rendered.html.replace(/<[^>]*>/g, " ").trim();
	return {
		slug,
		title,
		description,
		date,
		tag,
		...rendered,
		readTime: Math.max(1, Math.ceil(text.split(/\s+/).length / 200)),
	};
}

export async function loadNotes(directory = "./src/content/notes") {
	const notes: Note[] = [];
	for await (const filename of new Bun.Glob("*.md").scan({
		cwd: directory,
		onlyFiles: true,
	})) {
		const note = await parseNote(
			await Bun.file(join(directory, filename)).text(),
			filename.slice(0, -3),
		);
		if (note) notes.push(note);
	}
	return notes.sort(
		(a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug),
	);
}
