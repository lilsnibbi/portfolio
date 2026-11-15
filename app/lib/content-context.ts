import {
	createContext,
	data,
	redirect,
	type LoaderFunctionArgs,
} from "react-router";
import type { Project } from "../../config";
import type { Note } from "../../src/notes";

export type { Note } from "../../src/notes";

export interface ClientAssets {
	entry: string;
	styles: string[];
}

export interface ContentHeading {
	id: string;
	label: string;
	level: number;
}

export interface ProjectArticle extends Project {
	html: string;
	headings: ContentHeading[];
}

export interface ProjectContent {
	project: ProjectArticle;
	related: Project | null;
}

export interface NoteSummary
	extends Pick<
		Note,
		"slug" | "title" | "description" | "date" | "tag" | "readTime"
	> {
	dateLabel: string;
}

export interface ContentService {
	bootstrap(
		signal?: AbortSignal,
	): Promise<{ assets: ClientAssets; copyrightYear: number }>;
	projects(signal?: AbortSignal): Promise<Project[]>;
	project(
		slug: string,
		signal?: AbortSignal,
	): Promise<ProjectContent | undefined>;
	notes(signal?: AbortSignal): Promise<NoteSummary[]>;
	note(slug: string, signal?: AbortSignal): Promise<Note | undefined>;
	contact(signal?: AbortSignal): Promise<{ siteKey: string }>;
}

export const contentContext = createContext<ContentService>();

const noteDate = new Intl.DateTimeFormat("en-AU", {
	day: "numeric",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

export function formatNoteDate(date: string) {
	return noteDate.format(new Date(`${date}T00:00:00Z`));
}

export function rootLoader({ url, request, context }: LoaderFunctionArgs) {
	if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
		throw redirect(`${url.pathname.replace(/\/+$/, "")}${url.search}`, 308);
	}
	return context.get(contentContext).bootstrap(request.signal);
}

export function aboutLoader({ request }: LoaderFunctionArgs) {
	request.signal.throwIfAborted();
	return { now: new Date().toISOString() };
}

export async function projectsLoader({ request, context }: LoaderFunctionArgs) {
	const projects = await context.get(contentContext).projects(request.signal);
	return {
		featured: projects.filter((project) => project.isFront),
		more: projects.filter((project) => !project.isFront),
		count: projects.length,
	};
}

export async function projectLoader({
	params,
	request,
	context,
}: LoaderFunctionArgs) {
	if (!params.slug) throw data("Project not found", { status: 404 });
	const project = await context
		.get(contentContext)
		.project(params.slug, request.signal);
	if (!project) throw data("Project not found", { status: 404 });
	return project;
}

export async function notesLoader({ request, context }: LoaderFunctionArgs) {
	return { notes: await context.get(contentContext).notes(request.signal) };
}

export async function noteLoader({
	params,
	request,
	context,
}: LoaderFunctionArgs) {
	if (!params.slug) throw data("Note not found", { status: 404 });
	const note = await context
		.get(contentContext)
		.note(params.slug, request.signal);
	if (!note) throw data("Note not found", { status: 404 });
	return { note, dateLabel: formatNoteDate(note.date) };
}

export function contactLoader({ request, context }: LoaderFunctionArgs) {
	return context.get(contentContext).contact(request.signal);
}
