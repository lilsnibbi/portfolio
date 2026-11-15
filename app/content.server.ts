import config, { type Project } from "../config";
import { loadNotes, type Note, renderMarkdown } from "../src/notes";
import {
	formatNoteDate,
	type ClientAssets,
	type ContentService,
	type ProjectContent,
} from "./lib/content-context";

export async function renderProjectContent(source: string) {
	const { html, headings } = await renderMarkdown(source, "project");
	return {
		html,
		headings: headings.map(({ id, text, level }) => ({
			id,
			label: text,
			level,
		})),
	};
}

export function createContentService(assets: ClientAssets): ContentService {
	const projects: Project[] = config.projects.list;
	const projectArticles = new Map<string, Promise<ProjectContent>>();
	let notes: Promise<Note[]> | undefined;
	const readNotes = () => (notes ??= loadNotes("./src/content/notes"));

	return {
		async bootstrap(signal) {
			signal?.throwIfAborted();
			return {
				assets,
				copyrightYear: Number(
					new Intl.DateTimeFormat("en-AU", {
						timeZone: config.profile.timeZone,
						year: "numeric",
					}).format(new Date()),
				),
			};
		},
		async projects(signal) {
			signal?.throwIfAborted();
			return projects;
		},
		async project(slug, signal) {
			signal?.throwIfAborted();
			const index = projects.findIndex((project) => project.slug === slug);
			const project = projects[index];
			if (!project) return undefined;

			let article = projectArticles.get(slug);
			if (!article) {
				article = (async () => {
					const file = Bun.file(`./src/content/projects/${project.slug}.md`);
					if (!(await file.exists())) {
						throw new Error(`Missing project content: ${project.slug}.md`);
					}
					const content = await renderProjectContent(await file.text());
					return {
						project: { ...project, ...content },
						related:
							projects.length > 1
								? (projects[(index + 1) % projects.length] ?? null)
								: null,
					};
				})();
				projectArticles.set(slug, article);
			}
			const content = await article;
			signal?.throwIfAborted();
			return content;
		},
		async notes(signal) {
			signal?.throwIfAborted();
			const entries = await readNotes();
			signal?.throwIfAborted();
			return entries.map((note) => ({
				slug: note.slug,
				title: note.title,
				description: note.description,
				date: note.date,
				dateLabel: formatNoteDate(note.date),
				tag: note.tag,
				readTime: note.readTime,
			}));
		},
		async note(slug, signal) {
			signal?.throwIfAborted();
			const entries = await readNotes();
			signal?.throwIfAborted();
			return entries.find((note) => note.slug === slug);
		},
		async contact(signal) {
			signal?.throwIfAborted();
			return { siteKey: Bun.env.TURNSTILE_SITE_KEY?.trim() ?? "" };
		},
	};
}
