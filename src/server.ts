import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import config from "../config";
import { renderPage } from "./render";
import { handleScript } from "./scripts";

const renderedHtml = renderPage();
const etag = Bun.hash(renderedHtml).toString(16);

function handlePage(request: Request) {
	if (request.headers.get("if-none-match") === `"${etag}"`) {
		return new Response(null, { status: 304 });
	}

	return new Response(renderedHtml, {
		headers: {
			"cache-control": "public, max-age=300, must-revalidate",
			"content-type": "text/html; charset=utf-8",
			etag: `"${etag}"`,
			"referrer-policy": "strict-origin-when-cross-origin",
			"x-content-type-options": "nosniff",
		},
	});
}

new Elysia()
	.use(cors())
	.get("/", ({ request }) => handlePage(request))
	// A wildcard, not ":file": setup.sh fetches its component modules from
	// /scripts/setup/<name>.sh, and a single-segment param does not match that.
	.get("/scripts/*", ({ params, request }) =>
		handleScript(params["*"], request),
	)
	.get("/index.html", ({ request }) => handlePage(request))
	.get("/favicon.ico", () => Bun.file("./public/img/favicon.ico"))
	.get("/.well-known/cf-2fa-verify.txt", () => Bun.env.CF_TEMP_TOKEN ?? "")
	.get("/api/config", () => config)
	.get("/public/*", async ({ params, set }) => {
		const asset = params["*"];
		if (asset.includes("..") || asset.includes("\\")) {
			set.status = 400;
			return "Invalid asset path";
		}

		const file = Bun.file(`./public/${asset}`);
		if (await file.exists()) return file;

		set.status = 404;
		return "Not found";
	})
	.listen(3000, () => console.log("Portfolio online at http://localhost:3000"));
