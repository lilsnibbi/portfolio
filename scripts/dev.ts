import { type FSWatcher, watch } from "node:fs";
import { join, relative, sep } from "node:path";

const sourceDirectories = ["app", "src", "public", "scripts"] as const;
const configurationFiles = new Set(["config.ts", "bunfig.toml"]);
const debounceMilliseconds = 150;
type Snapshot = Map<string, string>;

function isMissingFile(error: unknown) {
	return (
		error instanceof Error &&
		"code" in error &&
		(error.code === "ENOENT" || error.code === "ENOTDIR")
	);
}

export async function dev() {
	const root = process.cwd();
	const port = process.env.PORT || "3000";
	const watchers: FSWatcher[] = [];
	const { promise: finished, resolve: finish } = Promise.withResolvers<void>();
	let snapshot: Snapshot = new Map();
	let child: Bun.Subprocess | undefined;
	let stoppingChild = false;
	let stopping = false;
	let debounce: ReturnType<typeof setTimeout> | undefined;
	let work: Promise<void> = Promise.resolve();

	function ignored(path: string) {
		const name = relative(root, path).split(sep).join("/");
		if (/^app\/\.?app\.generated\.css(?:$|[.~_-])/.test(name)) return true;
		return name
			.split("/")
			.some(
				(part) =>
					part === "build" || part === "node_modules" || part === ".git",
			);
	}

	async function captureSnapshot(): Promise<Snapshot> {
		const next: Snapshot = new Map();
		async function capture(path: string) {
			if (ignored(path)) return;
			try {
				const file = Bun.file(path);
				if (!(await file.exists())) return;
				next.set(relative(root, path), Bun.hash(await file.bytes()).toString());
			} catch (error) {
				// Editors can replace or remove a file between enumeration and reading.
				if (!isMissingFile(error)) throw error;
			}
		}
		for (const directory of sourceDirectories) {
			for await (const path of new Bun.Glob("**/*").scan({
				cwd: join(root, directory),
				absolute: true,
				dot: true,
				onlyFiles: true,
			})) {
				await capture(path);
			}
		}
		for (const filename of configurationFiles) {
			await capture(join(root, filename));
		}
		return next;
	}

	function unchanged(next: Snapshot) {
		if (next.size !== snapshot.size) return false;
		for (const [path, hash] of next) {
			if (snapshot.get(path) !== hash) return false;
		}
		return true;
	}

	async function stopChild() {
		const current = child;
		if (!current) return;
		stoppingChild = true;
		try {
			if (current.exitCode === null && current.signalCode === null) {
				current.kill("SIGTERM");
			}
			await current.exited;
		} finally {
			if (child === current) child = undefined;
			stoppingChild = false;
		}
	}

	function startChild() {
		if (stopping) return;
		console.info(`[dev] Starting Bun SSR server on port ${port}.`);
		const current = Bun.spawn([process.execPath, "src/server.tsx"], {
			cwd: root,
			env: { ...process.env, NODE_ENV: "development", PORT: port },
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		});
		child = current;
		void current.exited
			.then((exitCode) => {
				if (child !== current) return;
				child = undefined;
				if (!stopping && !stoppingChild) {
					console.error(
						`[dev] Server exited (${current.signalCode ?? exitCode}). Watching for the next edit.`,
					);
				}
			})
			.catch((error) => {
				if (child === current) child = undefined;
				console.error("[dev] Server process failed:", error);
			});
	}

	function enqueue(task: () => Promise<void>) {
		work = work.then(task).catch((error) => {
			console.error("[dev] Restart failed; watching for the next edit:", error);
		});
	}

	function scheduleRestart() {
		if (stopping) return;
		if (debounce) clearTimeout(debounce);
		debounce = setTimeout(() => {
			debounce = undefined;
			enqueue(async () => {
				if (stopping) return;
				const next = await captureSnapshot();
				if (unchanged(next)) return;
				console.info("[dev] Source changed; restarting the server.");
				await stopChild();
				if (stopping) return;
				// Coalesce edits received while the previous process was stopping.
				snapshot = await captureSnapshot();
				startChild();
			});
		}, debounceMilliseconds);
	}

	async function shutdown(exitCode: number) {
		if (stopping) return;
		stopping = true;
		if (debounce) clearTimeout(debounce);
		for (const watcher of watchers) watcher.close();
		try {
			await work;
			await stopChild();
		} finally {
			process.exitCode = exitCode;
			finish();
		}
	}

	function handleShutdown(exitCode: number) {
		void shutdown(exitCode).catch((error) => {
			console.error("[dev] Could not shut down cleanly:", error);
			process.exitCode = 1;
		});
	}
	const onInterrupt = () => handleShutdown(130);
	const onTerminate = () => handleShutdown(143);
	function track(watcher: FSWatcher, path: string) {
		watchers.push(watcher);
		watcher.on("error", (error) => {
			console.error(`[dev] File watcher failed for ${path}:`, error);
			handleShutdown(1);
		});
	}

	try {
		if (!(await Bun.file(join(root, "config.ts")).exists())) {
			throw new Error("Required watch input is missing: config.ts");
		}
		for (const directory of sourceDirectories) {
			const path = join(root, directory);
			track(
				watch(path, { recursive: true }, (_event, filename) => {
					if (!filename) return;
					if (!ignored(join(path, filename.toString()))) scheduleRestart();
				}),
				directory,
			);
		}
		// Watch the parent so atomic replacements and a newly created bunfig are seen.
		track(
			watch(root, (_event, filename) => {
				if (filename && configurationFiles.has(filename.toString())) {
					scheduleRestart();
				}
			}),
			"config.ts / bunfig.toml",
		);
		process.on("SIGINT", onInterrupt);
		process.on("SIGTERM", onTerminate);
		enqueue(async () => {
			snapshot = await captureSnapshot();
			startChild();
		});
		await finished;
	} finally {
		stopping = true;
		if (debounce) clearTimeout(debounce);
		for (const watcher of watchers) watcher.close();
		process.off("SIGINT", onInterrupt);
		process.off("SIGTERM", onTerminate);
		await work;
		await stopChild();
	}
}

if (import.meta.main) {
	try {
		await dev();
	} catch (error) {
		console.error("Development supervisor failed:", error);
		process.exitCode = 1;
	}
}
