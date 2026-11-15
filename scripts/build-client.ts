import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { ClientAssets } from "../app/lib/content-context";

const projectRoot = process.cwd();
const clientDirectory = resolve(projectRoot, "build/client");
const manifestPath = join(clientDirectory, "manifest.json");
const clientEntry = resolve(projectRoot, "app/entry.client.tsx");
const stylesheet = resolve(projectRoot, "app/app.css");
const generatedStylesheet = resolve(projectRoot, "app/app.generated.css");
const publicPath = "/assets/";

function pathKey(path: string) {
	const absolute = resolve(projectRoot, path);
	return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

async function requireFile(path: string) {
	if (!(await Bun.file(path).exists())) {
		throw new Error(
			`Required build input is missing: ${relative(projectRoot, path)}`,
		);
	}
}

async function compileStyles(production: boolean) {
	let executable: string;
	try {
		const packagePath = Bun.resolveSync(
			"@tailwindcss/cli/package.json",
			projectRoot,
		);
		const packageJson = await Bun.file(packagePath).json();
		const bin =
			typeof packageJson.bin === "string"
				? packageJson.bin
				: packageJson.bin?.tailwindcss;
		if (typeof bin !== "string" || !bin) {
			throw new Error("The installed Tailwind package has no CLI executable.");
		}
		executable = resolve(dirname(packagePath), bin);
		await requireFile(executable);
	} catch (cause) {
		throw new Error(
			"Tailwind CLI is unavailable. Install @tailwindcss/cli@4.3.5 before building.",
			{ cause },
		);
	}

	const compiler = Bun.spawn(
		[
			process.execPath,
			executable,
			"--input",
			stylesheet,
			"--output",
			generatedStylesheet,
		],
		{
			cwd: projectRoot,
			env: {
				...process.env,
				NODE_ENV: production ? "production" : "development",
			},
			stdin: "ignore",
			stdout: "inherit",
			stderr: "inherit",
		},
	);

	// A dev-server restart during compilation must also stop its compiler child.
	let interrupted: NodeJS.Signals | undefined;
	const interrupt = (signal: NodeJS.Signals) => {
		interrupted = signal;
		if (compiler.exitCode === null && compiler.signalCode === null) {
			compiler.kill(signal);
		}
	};
	const onInterrupt = () => interrupt("SIGINT");
	const onTerminate = () => interrupt("SIGTERM");
	process.once("SIGINT", onInterrupt);
	process.once("SIGTERM", onTerminate);

	let exitCode: number;
	try {
		exitCode = await compiler.exited;
	} finally {
		process.off("SIGINT", onInterrupt);
		process.off("SIGTERM", onTerminate);
	}

	if (interrupted) {
		throw new Error(`Tailwind compilation interrupted by ${interrupted}.`);
	}
	if (exitCode !== 0) {
		throw new Error(`Tailwind compilation failed with exit code ${exitCode}.`);
	}
	await requireFile(generatedStylesheet);
	if (Bun.file(generatedStylesheet).size === 0) {
		throw new Error("Tailwind compilation produced an empty stylesheet.");
	}
}

function assetUrl(artifact: Bun.BuildArtifact) {
	const outputPath = relative(clientDirectory, artifact.path);
	if (
		!outputPath ||
		isAbsolute(outputPath) ||
		outputPath === ".." ||
		outputPath.startsWith(`..${sep}`)
	) {
		throw new Error(`Build output is outside build/client: ${artifact.path}`);
	}
	return `${publicPath}${outputPath.split(sep).map(encodeURIComponent).join("/")}`;
}

/** Builds the browser assets before the SSR server starts accepting requests. */
export async function buildClient(production: boolean): Promise<ClientAssets> {
	await Promise.all([requireFile(clientEntry), requireFile(stylesheet)]);
	await compileStyles(production);

	const result = await Bun.build({
		entrypoints: [clientEntry, generatedStylesheet],
		root: projectRoot,
		outdir: clientDirectory,
		target: "browser",
		format: "esm",
		splitting: true,
		publicPath,
		naming: {
			entry: "[name]-[hash].[ext]",
			chunk: "chunk-[hash].[ext]",
			asset: "[name]-[hash].[ext]",
		},
		minify: production,
		sourcemap: production ? "none" : "linked",
		define: {
			"process.env.NODE_ENV": JSON.stringify(
				production ? "production" : "development",
			),
		},
		env: "disable",
		metafile: true,
		throw: false,
	});

	if (!result.success) {
		throw new AggregateError(result.logs, "Bun client asset build failed.");
	}
	for (const log of result.logs) console.warn(log);
	if (result.outputs.length === 0 || !result.metafile) {
		throw new Error(
			"Bun client build returned no artifacts or build metadata.",
		);
	}

	const outputMetadata = Object.entries(result.metafile.outputs);
	const findArtifact = (outputPath: string) => {
		// Metafile paths may be absolute or relative to the build's working directory.
		const paths = new Set([
			pathKey(outputPath),
			pathKey(resolve(clientDirectory, outputPath)),
		]);
		const artifact = result.outputs.find((output) =>
			paths.has(pathKey(output.path)),
		);
		if (!artifact || artifact.size === 0) {
			throw new Error(`Bun build artifact is missing or empty: ${outputPath}`);
		}
		return artifact;
	};
	const findEntry = (input: string) => {
		const matches = outputMetadata.filter(
			([, metadata]) =>
				metadata.entryPoint && pathKey(metadata.entryPoint) === pathKey(input),
		);
		if (matches.length !== 1 || !matches[0]) {
			throw new Error(
				`Expected one output for ${relative(projectRoot, input)}, found ${matches.length}.`,
			);
		}
		const [outputPath, metadata] = matches[0];
		return { artifact: findArtifact(outputPath), metadata };
	};

	const javascript = findEntry(clientEntry);
	const css = findEntry(generatedStylesheet);
	if (
		javascript.artifact.kind !== "entry-point" ||
		javascript.artifact.loader === "css" ||
		css.artifact.loader !== "css"
	) {
		throw new Error(
			"Bun did not produce the expected JavaScript and CSS entries.",
		);
	}

	const styles = new Set([assetUrl(css.artifact)]);
	if (javascript.metadata.cssBundle) {
		const importedStyles = findArtifact(javascript.metadata.cssBundle);
		if (importedStyles.loader !== "css") {
			throw new Error("The client entry's associated CSS bundle is invalid.");
		}
		styles.add(assetUrl(importedStyles));
	}
	const assets: ClientAssets = {
		entry: assetUrl(javascript.artifact),
		styles: [...styles],
	};
	await Bun.write(manifestPath, `${JSON.stringify(assets, null, 2)}\n`);
	return assets;
}

/** Loads the manifest produced by buildClient; production never compiles CSS. */
export async function loadClientAssets(): Promise<ClientAssets> {
	const file = Bun.file(manifestPath);
	if (!(await file.exists())) {
		throw new Error(
			"Client manifest is missing. Run the production build first.",
		);
	}
	const value: unknown = await file.json();
	if (
		!value ||
		typeof value !== "object" ||
		!("entry" in value) ||
		typeof value.entry !== "string" ||
		!value.entry.startsWith(publicPath) ||
		!("styles" in value) ||
		!Array.isArray(value.styles) ||
		value.styles.length === 0 ||
		!value.styles.every(
			(style): style is string =>
				typeof style === "string" && style.startsWith(publicPath),
		)
	) {
		throw new Error("Client manifest is invalid. Rebuild the browser assets.");
	}
	return { entry: value.entry, styles: value.styles };
}
