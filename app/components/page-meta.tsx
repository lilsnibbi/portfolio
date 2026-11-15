import config from "../../config";

export function PageMeta({
	title,
	description,
	path,
	noIndex = false,
}: {
	title: string;
	description: string;
	path: string;
	noIndex?: boolean;
}) {
	const url = new URL(path, config.site.url).href;
	return (
		<>
			<title>{title}</title>
			<meta name="description" content={description} />
			<meta
				name="robots"
				content={noIndex ? "noindex, follow" : "index, follow"}
			/>
			<meta property="og:type" content="website" />
			<meta property="og:title" content={title} />
			<meta property="og:description" content={description} />
			<meta property="og:url" content={url} />
			<meta name="twitter:card" content="summary" />
			<link rel="canonical" href={url} />
		</>
	);
}
