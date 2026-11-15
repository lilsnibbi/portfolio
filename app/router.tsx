import { data, type RouteObject } from "react-router";
import {
	aboutLoader,
	contactLoader,
	noteLoader,
	notesLoader,
	projectLoader,
	projectsLoader,
	rootLoader,
} from "./lib/content-context";
import Root, { ErrorBoundary } from "./root";
import About from "./routes/about";
import Contact from "./routes/contact";
import Home from "./routes/home";
import NotFound from "./routes/not-found";
import Note from "./routes/note";
import Notes from "./routes/notes";
import Project from "./routes/project";
import Projects from "./routes/projects";
import Uses from "./routes/uses";

export const routes: RouteObject[] = [
	{
		id: "root",
		path: "/",
		Component: Root,
		ErrorBoundary,
		loader: rootLoader,
		shouldRevalidate: () => false,
		children: [
			{ id: "home", index: true, Component: Home },
			{
				id: "about",
				path: "about",
				Component: About,
				loader: aboutLoader,
			},
			{ id: "uses", path: "uses", Component: Uses },
			{
				id: "projects",
				path: "projects",
				Component: Projects,
				loader: projectsLoader,
			},
			{
				id: "project",
				path: "projects/:slug",
				Component: Project,
				loader: projectLoader,
			},
			{
				id: "notes",
				path: "notes",
				Component: Notes,
				loader: notesLoader,
			},
			{
				id: "note",
				path: "notes/:slug",
				Component: Note,
				loader: noteLoader,
			},
			{
				id: "contact",
				path: "contact",
				Component: Contact,
				loader: contactLoader,
			},
			{
				id: "not-found",
				path: "*",
				Component: NotFound,
				loader: () => {
					throw data("Page not found", { status: 404 });
				},
			},
		],
	},
];
