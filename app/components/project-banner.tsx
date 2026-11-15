import type { Project } from "../../config";
import { cn } from "../lib/utils";

export function ProjectBanner({
	project,
	priority = false,
	className,
}: {
	project: Pick<Project, "title" | "banner">;
	priority?: boolean;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative aspect-[15/8] w-full overflow-hidden bg-muted/30",
				className,
			)}
		>
			{project.banner.url ? (
				<img
					src={project.banner.url}
					alt={project.banner.alt ?? `${project.title} project banner`}
					loading={priority ? "eager" : "lazy"}
					fetchPriority={priority ? "high" : undefined}
					decoding="async"
					className="absolute inset-0 block size-full object-scale-down object-[center_bottom]"
				/>
			) : null}
		</div>
	);
}
