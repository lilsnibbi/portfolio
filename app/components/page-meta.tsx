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
	const image = config.site.socialImage;
	const imageUrl = new URL(image.url, config.site.url).href;
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
			<meta property="og:image" content={imageUrl} />
			<meta property="og:image:type" content={image.type} />
			<meta property="og:image:width" content={String(image.width)} />
			<meta property="og:image:height" content={String(image.height)} />
			<meta property="og:image:alt" content={image.alt} />
			<meta name="twitter:card" content="summary_large_image" />
			<meta name="twitter:title" content={title} />
			<meta name="twitter:description" content={description} />
			<meta name="twitter:image" content={imageUrl} />
			<meta name="twitter:image:alt" content={image.alt} />
			<link rel="canonical" href={url} />
		</>
	);
}
