import type { Project } from "../../config";
import type {
	ClientAssets,
	ContentService,
	Note,
	NoteSummary,
	ProjectContent,
} from "./content-context";

function fetchContent(path: string, signal?: AbortSignal) {
	return fetch(path, {
		method: "GET",
		headers: { accept: "application/json" },
		signal,
	});
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
	const response = await fetchContent(path, signal);
	if (!response.ok) throw response;
	return response.json();
}

async function getDetail<T>(
	path: string,
	signal?: AbortSignal,
): Promise<T | undefined> {
	const response = await fetchContent(path, signal);
	if (response.status === 404) return undefined;
	if (!response.ok) throw response;
	return response.json();
}

export const contentClient: ContentService = {
	bootstrap: (signal) =>
		get<{ assets: ClientAssets; copyrightYear: number }>(
			"/api/content/bootstrap",
			signal,
		),
	projects: (signal) => get<Project[]>("/api/content/projects", signal),
	project: (slug, signal) =>
		getDetail<ProjectContent>(
			`/api/content/projects/${encodeURIComponent(slug)}`,
			signal,
		),
	notes: (signal) => get<NoteSummary[]>("/api/content/notes", signal),
	note: (slug, signal) =>
		getDetail<Note>(`/api/content/notes/${encodeURIComponent(slug)}`, signal),
	contact: (signal) => get<{ siteKey: string }>("/api/content/contact", signal),
};
