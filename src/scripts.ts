const SCRIPTS_BASE =
	"https://raw.githubusercontent.com/lilsnibbi/scripts/refs/heads/main/lib/";

/** Single path segment, no leading dot, so `..` and dotfiles are rejected. */
const VALID_NAME = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?(?:\.[a-zA-Z0-9]+)?$/;

const HIT_TTL_MS = 5 * 60_000;
const MISS_TTL_MS = 30_000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 512 * 1024;

type CacheEntry = {
	body: string;
	etag: string;
	expires: number;
	status: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

async function fetchScript(file: string): Promise<CacheEntry> {
	let response: Response;

	try {
		response = await fetch(`${SCRIPTS_BASE}${file}`, {
			headers: { accept: "text/plain" },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
	} catch {
		return {
			body: "Upstream unavailable",
			etag: "",
			expires: Date.now() + MISS_TTL_MS,
			status: 502,
		};
	}

	if (response.status === 404) {
		return {
			body: "Not found",
			etag: "",
			expires: Date.now() + MISS_TTL_MS,
			status: 404,
		};
	}

	if (!response.ok) {
		return {
			body: "Upstream error",
			etag: "",
			expires: Date.now() + MISS_TTL_MS,
			status: 502,
		};
	}

	const body = await response.text();

	if (Buffer.byteLength(body) > MAX_BYTES) {
		return {
			body: "Script too large",
			etag: "",
			expires: Date.now() + MISS_TTL_MS,
			status: 502,
		};
	}

	return {
		body,
		etag: `"${Bun.hash(body).toString(16)}"`,
		expires: Date.now() + HIT_TTL_MS,
		status: 200,
	};
}

async function loadScript(file: string): Promise<CacheEntry> {
	const cached = cache.get(file);
	if (cached && cached.expires > Date.now()) return cached;

	// Collapse concurrent misses for the same file into one upstream request.
	const pending = inflight.get(file);
	if (pending) return pending;

	const request = fetchScript(file)
		.then((entry) => {
			cache.set(file, entry);
			return entry;
		})
		.finally(() => inflight.delete(file));

	inflight.set(file, request);
	return request;
}

export async function handleScript(
	file: string,
	request: Request,
): Promise<Response> {
	if (!VALID_NAME.test(file)) {
		return new Response("Invalid script name", {
			status: 400,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	}

	const entry = await loadScript(file);

	if (entry.status !== 200) {
		return new Response(entry.body, {
			status: entry.status,
			headers: { "content-type": "text/plain; charset=utf-8" },
		});
	}

	const headers = {
		"cache-control": "public, max-age=300, must-revalidate",
		"content-type": "text/plain; charset=utf-8",
		etag: entry.etag,
		"x-content-type-options": "nosniff",
	};

	if (request.headers.get("if-none-match") === entry.etag) {
		return new Response(null, { status: 304, headers });
	}

	return new Response(entry.body, { headers });
}
