import { SCRIPT_URL } from "@marsidev/react-turnstile";

const SCRIPT_ID = "portfolio-contact-turnstile-script";

type ScriptLoad = {
	ready: Promise<string>;
	users: number;
	cancel: () => void;
};

let loading: ScriptLoad | undefined;

// The wrapper owns widgets; this shared loader makes script failures retryable.
// No browser globals are read until the component's effect calls this function.
export function acquireTurnstileScript() {
	if (window.turnstile) {
		const script = document.querySelector<HTMLScriptElement>(
			`script[src^="${SCRIPT_URL}"]`,
		);
		if (script) {
			script.id ||= SCRIPT_ID;
			return { ready: Promise.resolve(script.id), release: () => {} };
		}
	}

	let attempt = loading;
	if (!attempt) {
		let resolve!: (id: string) => void;
		let reject!: (error: Error) => void;
		const ready = new Promise<string>((success, failure) => {
			resolve = success;
			reject = failure;
		});
		const script = document.createElement("script");
		script.id = SCRIPT_ID;
		script.src = `${SCRIPT_URL}?render=explicit`;
		script.async = true;
		script.defer = true;

		const next: ScriptLoad = {
			ready,
			users: 0,
			cancel: () =>
				finish(
					window.turnstile ? undefined : new Error("Verification cancelled."),
				),
		};
		loading = next;
		attempt = next;

		const finish = (error?: Error) => {
			clearTimeout(timer);
			script.removeEventListener("load", onLoad);
			script.removeEventListener("error", onError);
			if (loading === next) loading = undefined;
			if (error) {
				script.remove();
				reject(error);
			} else {
				resolve(script.id);
			}
		};
		const onLoad = () => {
			if (window.turnstile) finish();
			else finish(new Error("Verification failed to initialize."));
		};
		const onError = () => finish(new Error("Verification failed to load."));
		const timer = setTimeout(
			() => finish(new Error("Verification took too long to load.")),
			20_000,
		);
		script.addEventListener("load", onLoad);
		script.addEventListener("error", onError);
		try {
			document.head.append(script);
		} catch {
			finish(new Error("Verification failed to load."));
		}
	}

	const subscription = attempt;
	subscription.users++;
	let released = false;
	return {
		ready: subscription.ready,
		release: () => {
			if (released) return;
			released = true;
			subscription.users--;
			// StrictMode immediately re-subscribes after its cleanup rehearsal.
			queueMicrotask(() => {
				if (loading === subscription && subscription.users === 0)
					subscription.cancel();
			});
		},
	};
}
