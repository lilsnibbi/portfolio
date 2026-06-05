await Bun.build({
	entrypoints: ["./src/server.ts"],
	minify: true,
	outdir: "build",
	sourcemap: false,
	target: "bun"
})