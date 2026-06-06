import { cpSync } from "node:fs";

await Promise.allSettled([
	Bun.build({
		entrypoints: ["./src/server.ts"],
		minify: true,
		outdir: "build",
		sourcemap: false,
		target: "bun",
	}),

	Bun.build({
		entrypoints: ["./public/index.html"],
		outdir: "build/public",
		minify: true,
		sourcemap: false,
		target: "browser",
	}),

	cpSync("./public/img/", "./build/public/img/", {
		force: true,
		recursive: true,
		preserveTimestamps: true,
	}),

	cpSync("./config.json", "./build/config.json", {
		force: true,
		preserveTimestamps: true,
	}),
]);
