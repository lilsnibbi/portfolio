import { Braces } from "lucide-react";
import config, { type ImageSource } from "../../config";
import { cn } from "../lib/utils";
import { ConfigIcon } from "./config-icon";
import { Badge } from "./ui/badge";

const symbols: Record<string, string> = {
	javascript: "javascript",
	typescript: "typescript",
	bun: "bun",
	docker: "docker",
	postgresql: "postgresql",
	github: "github",
	discord: "discord",
};
const tools = new Map(
	[
		...config.uses.languages,
		...config.uses.development,
		...config.uses.software,
	].map((tool) => [tool.name.toLowerCase(), tool] as const),
);

export function TechnologyIcon({
	name,
	image,
	className,
}: {
	name: string;
	image?: ImageSource;
	className?: string;
}) {
	const key = name.toLowerCase();
	const symbol = symbols[key];
	const fallback = symbol ? (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<use href={`/public/img/technologies.svg#${symbol}`} />
		</svg>
	) : (
		<Braces />
	);
	return (
		<ConfigIcon
			image={image ?? tools.get(key)?.icon}
			fallback={fallback}
			className={cn("size-4", className)}
		/>
	);
}

export function TechnologyBadge({ name }: { name: string }) {
	const hasIcon =
		tools.has(name.toLowerCase()) || name.toLowerCase() in symbols;
	return (
		<Badge
			variant="outline"
			className="gap-2 px-2.5 py-1 font-mono text-[13px] font-normal"
		>
			{hasIcon ? <TechnologyIcon name={name} /> : null}
			{name}
		</Badge>
	);
}
