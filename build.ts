import { cpSync, rmSync } from "node:fs";

rmSync("./build", { force: true, recursive: true });

const result = await Bun.build({
	entrypoints: ["./src/server.ts"],
	minify: false,
	outdir: "build",
	sourcemap: false,
	target: "bun",
});

if (!result.success) {
	for (const log of result.logs) console.error(log);
	throw new Error("Server build failed");
}

cpSync("./public", "./build/public", {
	force: true,
	recursive: true,
	preserveTimestamps: true,
});
