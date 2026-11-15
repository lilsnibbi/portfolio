import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import type { Project } from "../../config";
import { cn } from "../lib/utils";
import { ProjectBanner } from "./project-banner";
import { TechnologyBadge } from "./technology-badge";
import { Badge } from "./ui/badge";
import { buttonVariants } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export function ProjectLinks({
	project,
	className,
}: {
	project: Project;
	className?: string;
}) {
	const links = [
		{ url: project.github, label: "Source code" },
		{ url: project.demo, label: "Visit project" },
		{ url: project.development, label: "Development" },
	].filter((link) => link.url);

	if (!links.length) return null;

	return (
		<div
			className={cn(
				"flex flex-wrap justify-center gap-2 min-[801px]:justify-start",
				className,
			)}
		>
			{links.map((link) => (
				<a
					key={link.label}
					href={link.url}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(
						buttonVariants({ variant: "outline" }),
						"h-auto min-h-11 max-w-full whitespace-normal text-center transition-none",
					)}
				>
					{link.label}
					<ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
					<span className="sr-only"> (opens in a new tab)</span>
				</a>
			))}
		</div>
	);
}

export function ProjectCard({
	project,
	compact = false,
	headingLevel = 2,
	priority = false,
}: {
	project: Project;
	compact?: boolean;
	headingLevel?: 2 | 3;
	priority?: boolean;
}) {
	const Heading = headingLevel === 3 ? "h3" : "h2";
	const titleId = `project-card-${project.slug}`;
	const path = `/projects/${project.slug}`;

	return (
		<article aria-labelledby={titleId} className="min-w-0">
			<Card className="h-full gap-0 overflow-hidden border py-0 shadow-none ring-0 transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 hover:shadow-md motion-reduce:transition-none">
				<CardContent className="flex h-full flex-col p-0">
					<Link
						to={path}
						aria-label={`Read about ${project.title}`}
						className="block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
					>
						<ProjectBanner
							project={project}
							priority={priority}
							className={cn(
								"aspect-auto",
								compact ? "h-36" : "h-40 min-[801px]:h-60",
							)}
						/>
					</Link>
					<div
						className={cn(
							"grid flex-1 gap-5 border-t text-center min-[801px]:text-left",
							compact
								? "p-5"
								: "p-6 min-[801px]:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] min-[801px]:gap-8 min-[801px]:p-8",
						)}
					>
						<div className="min-w-0 space-y-3">
							<p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground min-[801px]:justify-start">
								<span>{project.category}</span>
								<span aria-hidden="true">/</span>
								<span>{project.year}</span>
							</p>
							<Heading
								id={titleId}
								className={cn(
									"font-semibold tracking-tight wrap-break-word",
									compact ? "text-2xl" : "text-3xl",
								)}
							>
								<Link
									to={path}
									className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card"
								>
									{project.title}
								</Link>
							</Heading>
							{project.status ? (
								<Badge
									variant="secondary"
									className="h-auto min-h-5 max-w-full whitespace-normal text-center font-normal"
								>
									{project.status}
								</Badge>
							) : null}
						</div>
						<div className="flex min-w-0 flex-col gap-5">
							<p className="text-sm leading-7 text-muted-foreground">
								{project.description}
							</p>
							<ul
								aria-label={`${project.title} technologies and availability`}
								className="flex flex-wrap justify-center gap-2 min-[801px]:justify-start"
							>
								{project.tags.map((tag) => (
									<li key={tag}>
										<TechnologyBadge name={tag} />
									</li>
								))}
							</ul>
							<div className="mt-auto flex justify-center min-[801px]:justify-start">
								<Link
									to={path}
									className={cn(
										buttonVariants({ variant: "ghost" }),
										"h-auto min-h-11 max-w-full whitespace-normal text-center transition-none",
									)}
								>
									Read about the project
									<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
								</Link>
							</div>
							<ProjectLinks project={project} />
						</div>
					</div>
				</CardContent>
			</Card>
		</article>
	);
}
