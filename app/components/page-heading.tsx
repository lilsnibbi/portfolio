import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export function PageHeading({
	eyebrow,
	title,
	description,
	className,
}: {
	eyebrow?: string;
	title: ReactNode;
	description?: string;
	className?: string;
}) {
	return (
		<header className={cn("text-center min-[801px]:text-left", className)}>
			{eyebrow ? (
				<p className="mb-5 font-mono text-sm tracking-wide text-muted-foreground">
					{eyebrow}
				</p>
			) : null}
			<h1 className="text-[clamp(2.5rem,5.5vw,3.75rem)] leading-[1.1] font-semibold tracking-[-0.05em] text-balance">
				{title}
			</h1>
			{description ? (
				<p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground min-[801px]:mx-0">
					{description}
				</p>
			) : null}
		</header>
	);
}
