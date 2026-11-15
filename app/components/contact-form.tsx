"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { acquireTurnstileScript } from "../lib/turnstile.client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

type ContactFormProps = {
	siteKey: string;
	discordUrl: string;
};

type WidgetSize = "compact" | "flexible";
type Feedback = { message: string; error: boolean };
type PendingRequest = {
	controller: AbortController;
	timer: ReturnType<typeof setTimeout>;
};

const VERIFICATION_PROMPT = "Complete verification to send your message.";
const VERIFICATION_UNAVAILABLE =
	"Verification unavailable. Retry verification or contact me on Discord.";
const DELIVERY_UNCONFIRMED =
	"Delivery could not be confirmed. Please try Discord or try again later.";

export function ContactForm(props: ContactFormProps) {
	const siteKey = props.siteKey.trim();
	// A changed sitekey must discard the old widget, token, and pending request.
	return <ContactFormContent key={siteKey} {...props} siteKey={siteKey} />;
}

function ContactFormContent({ siteKey, discordUrl }: ContactFormProps) {
	const id = useId();
	const mounted = useRef(false);
	const widget = useRef<TurnstileInstance | null>(null);
	const container = useRef<HTMLDivElement | null>(null);
	const request = useRef<PendingRequest | null>(null);
	const currentToken = useRef("");
	const spentToken = useRef("");
	const verifiedAt = useRef(0);
	const currentSize = useRef<WidgetSize | null>(null);
	const currentGeneration = useRef(0);
	const widgetLoaded = useRef(false);
	const verificationTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const [token, setToken] = useState("");
	const [sending, setSending] = useState(false);
	const [feedback, setFeedback] = useState<Feedback>({
		message: "",
		error: false,
	});
	const [verification, setVerification] = useState({
		message: siteKey
			? "Loading verification."
			: "Messaging is temporarily unavailable. Please contact me on Discord.",
		retry: false,
	});
	const [scriptId, setScriptId] = useState<string | null>(null);
	const [scriptAttempt, setScriptAttempt] = useState(0);
	const [size, setSize] = useState<WidgetSize | null>(null);
	const [generation, setGeneration] = useState(0);

	const clearToken = useCallback(() => {
		currentToken.current = "";
		verifiedAt.current = 0;
		setToken("");
	}, []);

	const unavailable = useCallback(
		(message = VERIFICATION_UNAVAILABLE) => {
			if (!mounted.current) return;
			clearTimeout(verificationTimer.current);
			clearToken();
			setVerification({ message, retry: true });
		},
		[clearToken],
	);

	const watchVerification = useCallback(() => {
		clearTimeout(verificationTimer.current);
		verificationTimer.current = setTimeout(
			() =>
				unavailable(
					"Verification took too long. Retry verification or contact me on Discord.",
				),
			20_000,
		);
	}, [unavailable]);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			clearTimeout(verificationTimer.current);
			if (request.current) {
				clearTimeout(request.current.timer);
				request.current.controller.abort();
				request.current = null;
			}
			currentToken.current = "";
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: A retry intentionally starts a fresh script subscription.
	useEffect(() => {
		if (!siteKey) return;
		let active = true;
		setScriptId(null);
		widgetLoaded.current = false;
		clearToken();
		setVerification({ message: "Loading verification.", retry: false });
		const script = acquireTurnstileScript();
		void script.ready.then(
			(loadedId) => {
				if (!active) return;
				setScriptId(loadedId);
				setVerification({ message: VERIFICATION_PROMPT, retry: false });
			},
			() => {
				if (active) unavailable();
			},
		);
		return () => {
			active = false;
			script.release();
		};
	}, [siteKey, scriptAttempt, clearToken, unavailable]);

	useEffect(() => {
		const element = container.current;
		if (!element) return;
		const measure = () => {
			const nextSize = element.clientWidth < 300 ? "compact" : "flexible";
			if (nextSize === currentSize.current) return;
			currentSize.current = nextSize;
			currentGeneration.current++;
			widgetLoaded.current = false;
			clearToken();
			setSize(nextSize);
			setGeneration(currentGeneration.current);
		};
		measure();
		if (typeof ResizeObserver === "undefined") {
			window.addEventListener("resize", measure);
			return () => window.removeEventListener("resize", measure);
		}
		const observer = new ResizeObserver(measure);
		observer.observe(element);
		return () => observer.disconnect();
	}, [clearToken]);

	useEffect(() => {
		if (
			!scriptId ||
			!size ||
			currentGeneration.current !== generation ||
			request.current ||
			currentToken.current
		)
			return;
		setVerification({ message: VERIFICATION_PROMPT, retry: false });
		watchVerification();
		return () => clearTimeout(verificationTimer.current);
	}, [scriptId, size, generation, watchVerification]);

	const resetVerification = () => {
		clearToken();
		setVerification({ message: VERIFICATION_PROMPT, retry: false });
		if (widgetLoaded.current && widget.current) {
			watchVerification();
			widget.current.reset();
		} else {
			// Remount also retries render failures where there is no widget to reset.
			currentGeneration.current++;
			setGeneration(currentGeneration.current);
		}
	};

	const isCurrentWidget = () =>
		mounted.current &&
		currentGeneration.current === generation &&
		!request.current;

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		// A ref closes the gap before React commits the disabled button.
		if (request.current) return;
		const form = event.currentTarget;
		const nameField = form.elements.namedItem("name") as HTMLInputElement;
		const emailField = form.elements.namedItem("email") as HTMLInputElement;
		const messageField = form.elements.namedItem(
			"message",
		) as HTMLTextAreaElement;
		for (const field of [nameField, emailField, messageField]) {
			field.value = field.value.trim();
			field.setCustomValidity("");
		}
		const name = nameField.value;
		const email = emailField.value;
		const message = messageField.value;
		nameField.setCustomValidity(
			!name
				? "Please enter your name."
				: name.length > 80 ||
						Array.from(name).some((character) => character.charCodeAt(0) < 32)
					? "Please enter a name of up to 80 characters without control characters."
					: "",
		);
		emailField.setCustomValidity(
			email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
				? "Please enter a valid email address of up to 254 characters."
				: "",
		);
		messageField.setCustomValidity(
			!message
				? "Please enter your message."
				: message.length > 3000
					? "Please keep your message to 3,000 characters or fewer."
					: "",
		);
		if (!form.reportValidity()) {
			setFeedback({
				message: "Please check the highlighted fields.",
				error: true,
			});
			return;
		}
		if (!currentToken.current || Date.now() - verifiedAt.current >= 300_000) {
			unavailable("Please complete verification before sending your message.");
			return;
		}

		const submittedToken = currentToken.current;
		spentToken.current = submittedToken;
		clearToken();
		clearTimeout(verificationTimer.current);
		const controller = new AbortController();
		const pending: PendingRequest = {
			controller,
			timer: setTimeout(() => controller.abort(), 30_000),
		};
		request.current = pending;
		setSending(true);
		setFeedback({ message: "Sending your message.", error: false });

		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				signal: controller.signal,
				body: JSON.stringify({ name, email, message, token: submittedToken }),
			});
			const result: unknown = await response.json();
			if (!mounted.current || request.current !== pending) return;
			const body =
				result && typeof result === "object" && !Array.isArray(result)
					? (result as Record<string, unknown>)
					: null;
			const delivered = response.ok && body?.ok === true;
			setFeedback({
				message:
					typeof body?.message === "string" && body.message.trim()
						? body.message
						: delivered
							? "Message sent. Thanks for reaching out!"
							: "Unable to send. Please try Discord or try again later.",
				error: !delivered,
			});
			if (delivered) form.reset();
		} catch {
			if (mounted.current && request.current === pending)
				setFeedback({ message: DELIVERY_UNCONFIRMED, error: true });
		} finally {
			clearTimeout(pending.timer);
			if (mounted.current && request.current === pending) {
				request.current = null;
				setSending(false);
				// Siteverify tokens are single-use, including on failed deliveries.
				resetVerification();
			}
		}
	}

	return (
		<section
			aria-labelledby={`${id}-title`}
			className="@container w-full min-w-0 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-8"
		>
			<header className="space-y-2 text-center">
				<h2
					id={`${id}-title`}
					className="text-2xl font-semibold tracking-tight"
				>
					Send a message.
				</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					An idea, a question, or just a hello.
				</p>
			</header>
			<form
				action="/api/contact"
				method="post"
				noValidate
				onSubmit={submit}
				aria-labelledby={`${id}-title`}
				aria-describedby={`${id}-verification ${id}-status`}
				aria-busy={sending}
				className="mt-8 grid min-w-0 gap-6"
			>
				<div className="grid min-w-0 gap-5 @min-[28rem]:grid-cols-2">
					<div className="min-w-0 space-y-2">
						<Label htmlFor={`${id}-name`}>Your name</Label>
						<Input
							id={`${id}-name`}
							name="name"
							autoComplete="name"
							placeholder="What should I call you?"
							maxLength={80}
							required
							readOnly={sending}
							onInput={(event) => event.currentTarget.setCustomValidity("")}
							className="h-12 min-w-0 bg-background text-base transition-none"
						/>
					</div>
					<div className="min-w-0 space-y-2">
						<Label htmlFor={`${id}-email`}>Email address</Label>
						<Input
							id={`${id}-email`}
							name="email"
							type="email"
							autoComplete="email"
							inputMode="email"
							autoCapitalize="none"
							spellCheck={false}
							placeholder="you@example.com"
							pattern={String.raw`[^\s@]+@[^\s@]+\.[^\s@]+`}
							maxLength={254}
							required
							readOnly={sending}
							onInput={(event) => event.currentTarget.setCustomValidity("")}
							className="h-12 min-w-0 bg-background text-base transition-none"
						/>
					</div>
				</div>
				<div className="min-w-0 space-y-2">
					<Label htmlFor={`${id}-message`}>What's on your mind?</Label>
					<Textarea
						id={`${id}-message`}
						name="message"
						rows={6}
						placeholder="Tell me a little about it…"
						maxLength={3000}
						required
						readOnly={sending}
						aria-describedby={`${id}-message-hint`}
						onInput={(event) => event.currentTarget.setCustomValidity("")}
						className="min-h-40 min-w-0 resize-y bg-background text-base transition-none"
					/>
					<p
						id={`${id}-message-hint`}
						className="text-xs leading-relaxed text-muted-foreground"
					>
						Up to 3,000 characters. All fields are required.
					</p>
				</div>
				<div className="grid min-w-0 justify-items-center gap-3">
					<div ref={container} className="flex min-w-0 w-full justify-center">
						{siteKey && scriptId && size ? (
							<Turnstile
								key={generation}
								ref={widget}
								id={`${id}-turnstile`}
								siteKey={siteKey}
								injectScript={false}
								scriptOptions={{ id: scriptId }}
								options={{
									action: "contact",
									theme: "dark",
									size,
									responseField: false,
									retry: "never",
									refreshExpired: "manual",
									refreshTimeout: "manual",
								}}
								onWidgetLoad={() => {
									if (
										mounted.current &&
										currentGeneration.current === generation
									)
										widgetLoaded.current = true;
								}}
								onSuccess={(value) => {
									if (!isCurrentWidget()) return;
									if (!value || value.length > 2048) {
										unavailable();
										return;
									}
									if (value === spentToken.current) return;
									clearTimeout(verificationTimer.current);
									currentToken.current = value;
									verifiedAt.current = Date.now();
									setToken(value);
									setVerification({
										message: "Verification complete. Ready to send.",
										retry: false,
									});
								}}
								onBeforeInteractive={() => {
									if (!isCurrentWidget()) return;
									clearTimeout(verificationTimer.current);
									setVerification({
										message: VERIFICATION_PROMPT,
										retry: false,
									});
								}}
								onExpire={() => {
									if (isCurrentWidget())
										unavailable(
											"Verification expired. Retry verification to continue.",
										);
								}}
								onTimeout={() => {
									if (isCurrentWidget())
										unavailable(
											"Verification timed out. Retry verification to continue.",
										);
								}}
								onError={() => {
									if (isCurrentWidget()) unavailable();
									return true;
								}}
								onUnsupported={() => {
									if (isCurrentWidget())
										unavailable(
											"Verification is not supported in this browser. Please try another browser or Discord.",
										);
								}}
							/>
						) : null}
					</div>
					<p
						id={`${id}-verification`}
						role="status"
						aria-live="polite"
						aria-atomic="true"
						className="text-center text-sm leading-relaxed text-muted-foreground"
					>
						{verification.message}
					</p>
					{siteKey && verification.retry ? (
						<Button
							type="button"
							variant="outline"
							disabled={sending}
							onClick={() => {
								if (request.current) return;
								if (scriptId) resetVerification();
								else setScriptAttempt((attempt) => attempt + 1);
							}}
							className="min-h-11 whitespace-normal transition-none"
						>
							Retry verification
						</Button>
					) : null}
				</div>
				<div className="flex justify-center">
					<Button
						type="submit"
						disabled={sending || !token || !siteKey}
						aria-describedby={`${id}-verification`}
						className="min-h-12 w-full px-7 transition-none sm:w-auto"
					>
						{sending ? "Sending…" : "Send message"}
					</Button>
				</div>
				<noscript>
					<p className="text-center text-sm text-muted-foreground">
						Please enable JavaScript to send a message, or use the Discord link
						below.
					</p>
				</noscript>
			</form>
			<p
				id={`${id}-status`}
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className={`mt-4 min-h-6 text-center text-sm leading-relaxed wrap-anywhere ${
					feedback.error ? "text-destructive" : "text-foreground"
				}`}
			>
				{feedback.message}
			</p>
			<p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
				Prefer Discord?{" "}
				<a
					href={discordUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="rounded-sm text-foreground underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
				>
					Contact me on Discord
					<span className="sr-only"> (opens in a new tab)</span>
				</a>
				.
			</p>
		</section>
	);
}
