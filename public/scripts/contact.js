document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("contact-form");
	const widget = document.getElementById("contact-turnstile");
	const status = document.getElementById("contact-status");
	const verification = document.getElementById("contact-verification-status");
	const retry = document.getElementById("contact-verification-retry");
	const fallback = document.getElementById("contact-fallback");
	const label = document.getElementById("contact-submit-label");
	if (!form || !widget || !status || !verification || !retry || !label) return;
	const button = form.querySelector("button[type=submit]");
	let widgetId;
	let widgetSize;
	let script;
	let loadTimer;
	let token = "";
	let sending = false;
	let verificationUnavailable = false;
	let deliveryFailed = false;
	const size = () => (widget.clientWidth < 300 ? "compact" : "flexible");
	const updateControls = () => {
		button.disabled = sending || !token;
		for (const field of form.querySelectorAll("input, textarea"))
			field.readOnly = sending;
		label.textContent = sending ? "Sending..." : "Send message";
		retry.hidden =
			!widget.dataset.sitekey || !verificationUnavailable || sending;
		if (fallback) fallback.hidden = !verificationUnavailable && !deliveryFailed;
	};
	const unavailable = (
		message = "Verification unavailable. Retry verification or contact me on Discord.",
	) => {
		token = "";
		verificationUnavailable = true;
		verification.textContent = message;
		updateControls();
	};
	const renderVerification = () => {
		clearTimeout(loadTimer);
		token = "";
		verificationUnavailable = false;
		verification.textContent = "Complete verification to send your message.";
		updateControls();
		try {
			if (widgetId !== undefined && widgetSize === size()) {
				window.turnstile.reset(widgetId);
				return;
			}
			if (widgetId !== undefined) window.turnstile.remove(widgetId);
			widgetId = undefined;
			widgetSize = size();
			widgetId = window.turnstile.render(widget, {
				sitekey: widget.dataset.sitekey,
				action: "contact",
				theme: "dark",
				size: widgetSize,
				callback: (value) => {
					if (typeof value !== "string" || !value) {
						unavailable();
						return;
					}
					token = value;
					verificationUnavailable = false;
					verification.textContent = "Verification complete. Ready to send.";
					updateControls();
				},
				"expired-callback": () =>
					unavailable("Verification expired. Retry verification to continue."),
				"timeout-callback": () =>
					unavailable(
						"Verification timed out. Retry verification to continue.",
					),
				"error-callback": () => {
					unavailable();
					return true;
				},
			});
		} catch {
			unavailable();
		}
	};
	const loadVerification = () => {
		if (window.turnstile) {
			renderVerification();
			return;
		}
		token = "";
		verificationUnavailable = false;
		verification.textContent = "Loading verification.";
		updateControls();
		clearTimeout(loadTimer);
		script?.remove();
		window.onContactTurnstileLoad = renderVerification;
		script = document.createElement("script");
		script.src =
			"https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactTurnstileLoad&render=explicit";
		script.async = true;
		script.onerror = () => {
			clearTimeout(loadTimer);
			unavailable();
		};
		loadTimer = setTimeout(
			() =>
				unavailable(
					"Verification took too long. Retry or contact me on Discord.",
				),
			20000,
		);
		document.head.append(script);
	};

	for (const field of [
		form.elements.namedItem("name"),
		form.elements.namedItem("message"),
	]) {
		field.addEventListener("input", () => field.setCustomValidity(""));
	}
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (sending) return;
		for (const name of ["name", "message"]) {
			const field = form.elements.namedItem(name);
			field.setCustomValidity(
				field.value.trim()
					? ""
					: name === "name"
						? "Please enter your name."
						: "Please enter your message.",
			);
		}
		if (!form.reportValidity() || !token) return;
		sending = true;
		deliveryFailed = false;
		updateControls();
		form.setAttribute("aria-busy", "true");
		status.textContent = "Sending your message.";
		const fields = new FormData(form);
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				signal: AbortSignal.timeout(30000),
				body: JSON.stringify({
					name: fields.get("name"),
					email: fields.get("email"),
					message: fields.get("message"),
					token,
				}),
			});
			const result = await response.json();
			deliveryFailed = !(response.ok && result.ok === true);
			status.textContent =
				typeof result.message === "string"
					? result.message
					: deliveryFailed
						? "Unable to send. Please try again later."
						: "Message sent. Thanks for reaching out!";
			if (!deliveryFailed) form.reset();
		} catch {
			deliveryFailed = true;
			status.textContent =
				"Delivery could not be confirmed. Please try Discord or try again later.";
		} finally {
			sending = false;
			token = "";
			form.removeAttribute("aria-busy");
			renderVerification();
		}
	});
	retry.addEventListener("click", loadVerification);
	window.addEventListener("resize", () => {
		if (!sending && widgetId !== undefined && widgetSize !== size())
			renderVerification();
	});
	if (widget.dataset.sitekey) loadVerification();
	else
		unavailable(
			"Messaging is temporarily unavailable. Please contact me on Discord.",
		);
});
