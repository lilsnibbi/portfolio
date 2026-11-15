import { type ReactNode, useEffect, useState } from "react";
import {
	isRouteErrorResponse,
	Link,
	Outlet,
	ScrollRestoration,
	useLoaderData,
	useLocation,
	useRouteError,
	useRouteLoaderData,
} from "react-router";
import config from "../config";
import type { ClientAssets, rootLoader } from "./lib/content-context";
import { PageMeta } from "./components/page-meta";
import { SiteShell } from "./components/site-shell";
import { buttonVariants } from "./components/ui/button";
function Document({
	children,
	assets,
}: {
	children: ReactNode;
	assets?: ClientAssets;
}) {
	const { hash } = useLocation();
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);

	return (
		<html
			lang="en"
			className="dark"
			data-section-scroll={
				hydrated && hash && hash !== "#main" ? "" : undefined
			}
		>
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="theme-color" content="#080808" />
				<meta name="color-scheme" content="dark" />
				<link rel="icon" href={config.site.favicon.url} />
				{assets?.styles.map((href) => (
					<link key={href} rel="stylesheet" href={href} precedence="app" />
				))}
			</head>
			<body id="top">
				{children}
				<ScrollRestoration />
				{assets?.entry ? <script type="module" src={assets.entry} /> : null}
			</body>
		</html>
	);
}

export default function App() {
	const { assets } = useLoaderData<typeof rootLoader>();
	return (
		<Document assets={assets}>
			<SiteShell>
				<Outlet />
			</SiteShell>
		</Document>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const rootData = useRouteLoaderData<typeof rootLoader>("root");
	const location = useLocation();
	const notFound = isRouteErrorResponse(error) && error.status === 404;
	const title = notFound ? "Page not found" : "Something went wrong";
	const description = notFound
		? "This page doesn't exist, or it's found a new home."
		: "The page couldn't be loaded. Please try again.";

	return (
		<Document assets={rootData?.assets}>
			<SiteShell activeNavigation={false}>
				<PageMeta
					title={`${title} — ${config.profile.name}`}
					description={description}
					path={location.pathname}
					noIndex
				/>
				<section className="mx-auto max-w-2xl text-center">
					<p className="mb-6 font-mono text-sm text-muted-foreground">
						{notFound ? "404 / A little off the path" : "A small interruption"}
					</p>
					<h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
						{notFound ? "Nothing here. Plenty elsewhere." : title}
					</h1>
					<p className="mt-6 text-base leading-relaxed text-muted-foreground">
						{description}
					</p>
					<Link to="/" className={buttonVariants({ className: "mt-8" })}>
						Back to home
					</Link>
				</section>
			</SiteShell>
		</Document>
	);
}
