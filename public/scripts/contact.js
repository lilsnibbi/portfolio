document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("contact-form");
	const widget = document.getElementById("contact-turnstile");
	const status = document.getElementById("contact-status");
	if (!form || !widget || !status) return;
	const button = form.querySelector("button[type=submit]");
	let widgetId;
	let token = "";
	let sending = false;
	const unavailable = () => {
		token = "";
		button.disabled = true;
		status.textContent =
			"Verification unavailable. Please reload or contact me on Discord.";
	};
	if (!widget.dataset.sitekey) {
		unavailable();
		return;
	}
	const loadTimer = setTimeout(unavailable, 20000);
	window.onContactTurnstileLoad = () => {
		clearTimeout(loadTimer);
		widgetId = window.turnstile.render(widget, {
			sitekey: widget.dataset.sitekey,
			action: "contact",
			theme: "dark",
			size: "flexible",
			callback: (value) => {
				token = value;
				button.disabled = sending;
				if (
					status.textContent === "Loading verification…" ||
					status.textContent.startsWith("Verification unavailable.")
				)
					status.textContent = "";
			},
			"expired-callback": () => {
				token = "";
				button.disabled = true;
			},
			"error-callback": unavailable,
		});
	};
	const script = document.createElement("script");
	script.src =
		"https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onContactTurnstileLoad&render=explicit";
	script.async = true;
	script.onerror = () => {
		clearTimeout(loadTimer);
		unavailable();
	};
	document.head.append(script);
	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (sending || !token || !form.reportValidity()) return;
		sending = true;
		button.disabled = true;
		form.setAttribute("aria-busy", "true");
		status.textContent = "Sending…";
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
			status.textContent =
				result.message || "Unable to send. Please try again later.";
			if (response.ok && result.ok) form.reset();
		} catch {
			status.textContent =
				"Delivery could not be confirmed. Please try Discord or try again later.";
		} finally {
			sending = false;
			token = "";
			button.disabled = true;
			form.removeAttribute("aria-busy");
			if (widgetId !== undefined) window.turnstile.reset(widgetId);
		}
	});
});
