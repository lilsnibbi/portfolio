import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function ReadingRail({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-reading-rail
			className={cn(
				"min-w-0 self-start min-[801px]:sticky min-[801px]:top-[var(--anchor-offset)] min-[801px]:max-h-[calc(100dvh-var(--anchor-offset)-1.5rem)] min-[801px]:overflow-y-auto min-[801px]:scroll-py-2 min-[801px]:p-1.5 min-[801px]:[scrollbar-width:thin]",
				className,
			)}
			{...props}
		/>
	);
}
