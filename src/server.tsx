import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { isbot } from "isbot";
import { StrictMode } from "react";
import { renderToReadableStream } from "react-dom/server";
import {
	createStaticHandler,
	createStaticRouter,
	RouterContextProvider,
	StaticRouterProvider,
} from "react-router";
import { createContentService } from "../app/content.server";
import {
	type ClientAssets,
	contentContext,
	type ContentService,
} from "../app/lib/content-context";
import { routes } from "../app/router";
import config from "../config";
import { buildClient, loadClientAssets } from "../scripts/build-client";
import { createContactHandler, redisLimiter } from "./contact";
import { handleScript } from "./scripts";

type ContactHandler = (request: Request, peerIp: string) => Promise<Response>;

export interface ServerOptions {
	port?: number;
	production?: boolean;
	assets?: ClientAssets;
	content?: ContentService;
	contact?: ContactHandler;
}

const securityHeaders = {
	"referrer-policy": "strict-origin-when-cross-origin",
	"x-content-type-options": "nosniff",
};
const staticHandler = createStaticHandler(routes);

function json(value: unknown, status = 200) {
	return Response.json(value, {
		status,
		headers: { ...securityHeaders, "cache-control": "no-store" },
	});
}

function createContact(): ContactHandler {
	return createContactHandler(
		{
			secret: Bun.env.TURNSTILE_SECRET_KEY ?? "",
			webhook: Bun.env.DISCORD_WEBHOOK_URL ?? "",
			origins: (Bun.env.CONTACT_ORIGINS ?? "")
				.split(",")
				.map((origin) => origin.trim())
				.filter(Boolean),
			railway: !!Bun.env.RAILWAY_ENVIRONMENT_ID,
		},
		Bun.env.CONTACT_REDIS_URL
			? redisLimiter(Bun.env.CONTACT_REDIS_URL)
			: async () => {
					throw new Error("Redis is required");
				},
	);
}

async function assetResponse(
	request: Request,
	directory: string,
	prefix: string,
	immutable: boolean,
) {
	if (request.method !== "GET" && request.method !== "HEAD") {
		return new Response("Method not allowed", {
			status: 405,
			headers: { allow: "GET, HEAD" },
		});
	}
	let pathname: string;
	try {
		pathname = decodeURIComponent(
			new URL(request.url).pathname.slice(prefix.length),
		);
	} catch {
		return new Response("Invalid asset path", { status: 400 });
	}
	if (!pathname || pathname.includes("\0") || pathname.includes("\\")) {
		return new Response("Not found", { status: 404 });
	}
	const root = resolve(directory);
	const filename = resolve(root, pathname);
	const inside = relative(root, filename);
	if (
		inside === ".." ||
		inside.startsWith("../") ||
		inside.startsWith("..\\") ||
		isAbsolute(inside)
	) {
		return new Response("Invalid asset path", { status: 400 });
	}
	try {
		if (!(await stat(filename)).isFile())
			return new Response("Not found", { status: 404 });
	} catch (error) {
		if (
			(error as NodeJS.ErrnoException).code === "ENOENT" ||
			(error as NodeJS.ErrnoException).code === "ENOTDIR"
		) {
			return new Response("Not found", { status: 404 });
		}
		throw error;
	}
	const file = Bun.file(filename);
	return new Response(request.method === "HEAD" ? null : file, {
		headers: {
			...securityHeaders,
			"content-type": file.type,
			"content-length": String(file.size),
			"cache-control": immutable
				? "public, max-age=31536000, immutable"
				: "public, max-age=0, must-revalidate",
		},
	});
}

async function documentResponse(request: Request, content: ContentService) {
	const requestContext = new RouterContextProvider();
	requestContext.set(contentContext, content);
	const context = await staticHandler.query(request, { requestContext });
	if (context instanceof Response) return context;

	const headers = new Headers({
		...securityHeaders,
		"content-type": "text/html; charset=utf-8",
		"cache-control": "no-store",
	});
	for (const match of context.matches) {
		const loaderHeaders = context.loaderHeaders[match.route.id];
		const actionHeaders = context.actionHeaders[match.route.id];
		for (const source of [loaderHeaders, actionHeaders]) {
			source?.forEach((value, name) => {
				headers.set(name, value);
			});
		}
	}
	if (request.method === "HEAD")
		return new Response(null, { status: context.statusCode, headers });

	let status = context.statusCode;
	const router = createStaticRouter(staticHandler.dataRoutes, context);
	const body = await renderToReadableStream(
		<StrictMode>
			<StaticRouterProvider router={router} context={context} />
		</StrictMode>,
		{
			signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
			onError(error) {
				status = 500;
				console.error(error);
			},
		},
	);
	if (isbot(request.headers.get("user-agent") ?? "")) await body.allReady;
	return new Response(body, { status, headers });
}

export async function startServer(options: ServerOptions = {}) {
	const production = options.production ?? Bun.env.NODE_ENV === "production";
	const assets =
		options.assets ??
		(production ? await loadClientAssets() : await buildClient(false));
	const content = options.content ?? createContentService(assets);
	const contact = options.contact ?? createContact();

	return Bun.serve({
		port: options.port ?? Number(Bun.env.PORT ?? 3000),
		development: false,
		maxRequestBodySize: 16384,
		idleTimeout: 30,
		routes: {
			"/api/contact": {
				POST: (request, server) =>
					contact(request, server.requestIP(request)?.address ?? ""),
			},
			"/api/config": { GET: () => json(config) },
			"/api/content/bootstrap": {
				GET: async (request) => json(await content.bootstrap(request.signal)),
			},
			"/api/content/projects": {
				GET: async (request) => json(await content.projects(request.signal)),
			},
			"/api/content/projects/:slug": {
				GET: async (request) => {
					const project = await content.project(
						request.params.slug,
						request.signal,
					);
					return project
						? json(project)
						: json({ message: "Project not found" }, 404);
				},
			},
			"/api/content/notes": {
				GET: async (request) => json(await content.notes(request.signal)),
			},
			"/api/content/notes/:slug": {
				GET: async (request) => {
					const note = await content.note(request.params.slug, request.signal);
					return note ? json(note) : json({ message: "Note not found" }, 404);
				},
			},
			"/api/content/contact": {
				GET: async (request) => json(await content.contact(request.signal)),
			},
			"/assets/*": (request) =>
				assetResponse(request, "./build/client", "/assets/", production),
			"/public/*": (request) =>
				assetResponse(request, "./public", "/public/", false),
			"/scripts/*": (request) =>
				handleScript(
					new URL(request.url).pathname.slice("/scripts/".length),
					request,
				),
			"/favicon.ico": () =>
				new Response(Bun.file("./public/img/favicon.ico"), {
					headers: securityHeaders,
				}),
			"/.well-known/cf-2fa-verify.txt": () =>
				new Response(Bun.env.CF_TEMP_TOKEN ?? ""),
			"/index.html": (request) =>
				new Response(null, {
					status: 308,
					headers: { location: `/${new URL(request.url).search}` },
				}),
			"/work": (request) =>
				new Response(null, {
					status: 308,
					headers: { location: `/projects${new URL(request.url).search}` },
				}),
			"/robots.txt": () =>
				new Response(
					`User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", config.site.url).href}\n`,
					{
						headers: { "content-type": "text/plain; charset=utf-8" },
					},
				),
			"/sitemap.xml": async (request) => {
				const notes = await content.notes(request.signal);
				const projects = await content.projects(request.signal);
				const paths = [
					"/",
					"/about",
					"/uses",
					"/projects",
					...projects.map((project) => `/projects/${project.slug}`),
					"/notes",
					...notes.map((note) => `/notes/${note.slug}`),
					"/contact",
				];
				const urls = paths
					.map(
						(path) =>
							`<url><loc>${new URL(path, config.site.url).href.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</loc></url>`,
					)
					.join("");
				return new Response(
					`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
					{
						headers: { "content-type": "application/xml; charset=utf-8" },
					},
				);
			},
		},
		fetch: (request) => documentResponse(request, content),
		error(error) {
			console.error(error);
			return new Response("Internal server error", {
				status: 500,
				headers: { "cache-control": "no-store" },
			});
		},
	});
}

if (import.meta.main) {
	const server = await startServer();
	console.log(`Portfolio online at ${server.url}`);
	const stop = async () => {
		await server.stop(true);
		process.exit(0);
	};
	process.on("SIGINT", stop);
	process.on("SIGTERM", stop);
}
