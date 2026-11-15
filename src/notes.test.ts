import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadNotes, parseNote, renderMarkdown } from "./notes";

const source = (body: string, date = "2026-11-15") => `---
title: "A useful note"
description: "A short description."
date: "${date}"
tag: "Development"
---

${body}`;

describe("Markdown notes", () => {
	test("renders the Markdown fixture with semantic formatting and responsive containers", async () => {
		const note = await parseNote(
			await Bun.file("./src/fixtures/markdown.md").text(),
			"markdown-preview",
		);
		if (!note) throw new Error("Expected a published fixture");
		expect(note.title).toBe("Markdown formatting preview");
		expect(note.tag).toBe("Preview");
		expect(note.readTime).toBeGreaterThanOrEqual(1);
		for (const tag of [
			"strong",
			"em",
			"del",
			"ol",
			"ul",
			"blockquote",
			"table",
			"hr",
		]) {
			expect(note.html).toContain(`<${tag}`);
		}
		expect(note.html).toContain('type="checkbox"');
		expect(note.html).toContain('class="table-scroll"');
		expect(note.html).toContain('tabindex="0"');
		expect(note.html).toContain('data-language="ts"');
		expect(note.html).toContain(
			"&lt;script&gt;This is code, not HTML.&lt;/script&gt;",
		);
		expect(note.html).not.toContain("<script>");
		expect(note.html).toContain('href="https://example.com/docs"');
		expect(note.html).toContain('href="#note-tables"');
		expect(note.html).toContain('loading="lazy"');
		expect(note.headings[0]?.text).toBe("Formatted & useful");
		expect(note.headings.find((heading) => heading.level === 3)?.text).toBe(
			"A smaller heading",
		);
	});

	test.each([undefined, "project"])(
		"generates unique, scoped heading anchors and rewrites forward links (namespace: %s)",
		async (namespace) => {
			const rendered = await renderMarkdown(
				"[Jump](#repeat)\n\n## Repeat\n\n## Repeat\n\n## Repeat-1\n\n## Main",
				namespace,
			);
			const prefix = `${namespace ?? "note"}-`;
			const ids = rendered.headings.map((heading) => heading.id);
			expect(new Set(ids).size).toBe(ids.length);
			expect(ids.every((id) => id.startsWith(prefix))).toBe(true);
			expect(rendered.html).toContain(`href="#${prefix}repeat"`);
			expect(rendered.html).not.toContain('id="main"');
		},
	);

	test("keeps one page title while retaining Markdown heading hierarchy", async () => {
		const rendered = await renderMarkdown(
			"# Section\n\n## Subsection\n\n### Detail",
		);
		expect(rendered.headings.map((heading) => heading.level)).toEqual([
			2, 3, 4,
		]);
		expect(rendered.html).not.toContain("<h1");
	});

	test("keeps literal HTML inert and rejects executable link protocols", async () => {
		const rendered = await renderMarkdown(
			'<script>alert("test")</script>\n\n[Bad](javascript:alert%281%29)\n\n![Bad](data:text/html,bad)\n\n[Good](mailto:hello@example.com)',
		);
		expect(rendered.html).not.toContain("<script");
		expect(rendered.html).not.toContain('href="javascript:');
		expect(rendered.html).not.toContain('src="data:');
		expect(rendered.html).toContain('href="mailto:hello@example.com"');
	});

	test("validates front matter and real calendar dates", async () => {
		await expect(parseNote("## No metadata", "no-metadata")).rejects.toThrow(
			"front matter",
		);
		await expect(parseNote(source("Content"), "Bad Name")).rejects.toThrow(
			"filename",
		);
		await expect(
			parseNote(source("Content", "2026-02-30"), "bad-date"),
		).rejects.toThrow("valid YYYY-MM-DD");
		await expect(
			parseNote(
				source("Content").replace('title: "A useful note"', "title: 123"),
				"bad-title",
			),
		).rejects.toThrow('"title"');
		await expect(parseNote(source(""), "empty")).rejects.toThrow(
			"Markdown content",
		);
	});

	test("discovers Markdown files, sorts by date, and omits drafts and HTML files", async () => {
		const root = join(tmpdir(), "opencode");
		await mkdir(root, { recursive: true });
		const directory = await mkdtemp(join(root, "portfolio-notes-"));
		try {
			await Promise.all([
				Bun.write(
					join(directory, "older.md"),
					source("## Older", "2026-10-01"),
				),
				Bun.write(
					join(directory, "newer.md"),
					source("## Newer", "2026-11-01"),
				),
				Bun.write(join(directory, "draft.md"), "---\ndraft: true\n---\n"),
				Bun.write(
					join(directory, "old-format.html"),
					"<p>Not a Markdown note.</p>",
				),
			]);
			const notes = await loadNotes(directory);
			expect(notes.map((note) => note.slug)).toEqual(["newer", "older"]);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
