import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { buildClient } from "./build-client";

export async function build() {
	const root = process.cwd();
	const serverEntry = resolve(root, "src/server.tsx");
	for (const input of [
		serverEntry,
		resolve(root, "app/entry.client.tsx"),
		resolve(root, "app/app.css"),
	]) {
		if (!(await Bun.file(input).exists())) {
			throw new Error(`Required build input is missing: ${input}`);
		}
	}

	// Only this generated output directory is removed.
	await rm(resolve(root, "build"), { recursive: true, force: true });
	const assets = await buildClient(true);
	const server = await Bun.build({
		entrypoints: [serverEntry],
		root,
		outdir: resolve(root, "build/server"),
		target: "bun",
		format: "esm",
		packages: "external",
		naming: { entry: "index.js" },
		define: { "process.env.NODE_ENV": JSON.stringify("production") },
		env: "disable",
		sourcemap: "none",
		throw: false,
	});

	if (!server.success) {
		throw new AggregateError(server.logs, "Bun SSR server build failed.");
	}
	for (const log of server.logs) console.warn(log);
	const serverArtifact = server.outputs.find(
		(output) => output.kind === "entry-point",
	);
	if (!serverArtifact || serverArtifact.size === 0) {
		throw new Error("Bun SSR build returned no server entry artifact.");
	}
	if (server.outputs.some((output) => output.loader === "css")) {
		throw new Error(
			"The SSR module graph imports CSS. Keep stylesheet imports in the browser asset pipeline.",
		);
	}

	console.info(
		`Built ${assets.entry}, ${assets.styles.length} stylesheet(s), and build/server/index.js.`,
	);
}

if (import.meta.main) {
	try {
		await build();
	} catch (error) {
		console.error("Production build failed:", error);
		process.exitCode = 1;
	}
}
