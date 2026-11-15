import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { createBrowserRouter, RouterContextProvider } from "react-router";
import { RouterProvider } from "react-router/dom";
import { contentClient } from "./lib/content.client";
import { contentContext } from "./lib/content-context";
import { routes } from "./router";

const router = createBrowserRouter(routes, {
	getContext() {
		const context = new RouterContextProvider();
		context.set(contentContext, contentClient);
		return context;
	},
});

hydrateRoot(
	document,
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
