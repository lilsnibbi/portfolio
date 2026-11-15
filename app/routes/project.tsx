import { ArrowLeft } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import config from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { ProjectBanner } from "../components/project-banner";
import { ProjectCard, ProjectLinks } from "../components/project-card";
import { ReadingRail } from "../components/reading-rail";
import { TableOfContents } from "../components/table-of-contents";
import { TechnologyBadge } from "../components/technology-badge";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import type { projectLoader } from "../lib/content-context";
import { cn } from "../lib/utils";

export default function Project() {
	const { project, related } = useLoaderData<typeof projectLoader>();
	const contents = project.headings.filter((heading) => heading.level <= 3);

	return (
		<div className="flex flex-col gap-10 min-[801px]:gap-12">
			<PageMeta
				title={`${project.title} — ${config.profile.name}`}
				description={project.description}
				path={`/projects/${project.slug}`}
			/>
			<div className="flex flex-col gap-6 text-center min-[801px]:text-left">
				<Link
					to="/projects"
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"min-h-11 self-center transition-none min-[801px]:self-start",
					)}
				>
					<ArrowLeft aria-hidden="true" className="size-4" />
					All projects
				</Link>
				<PageHeading
					eyebrow={project.category}
					title={project.title}
					description={project.description}
				/>
				<div className="flex flex-wrap items-center justify-center gap-3 min-[801px]:justify-start">
					<span className="font-mono text-sm text-muted-foreground">
						{project.year}
					</span>
					{project.status ? (
						<Badge
							variant="secondary"
							className="h-auto min-h-5 max-w-full whitespace-normal text-center"
						>
							{project.status}
						</Badge>
					) : null}
					{project.tags.map((tag) => (
						<TechnologyBadge key={tag} name={tag} />
					))}
				</div>
				<ProjectLinks project={project} />
			</div>
			<ProjectBanner project={project} priority className="rounded-xl border" />
			<div
				className={cn(
					"grid min-w-0 gap-8 min-[801px]:gap-12",
					contents.length ? "min-[801px]:grid-cols-[minmax(0,1fr)_12rem]" : "",
				)}
			>
				{contents.length ? (
					<ReadingRail className="min-[801px]:col-start-2 min-[801px]:row-start-1">
						<TableOfContents
							items={contents}
							title="In this project"
							className="max-[800px]:text-center max-[800px]:[&_a]:justify-center max-[800px]:[&_a]:text-center"
						/>
					</ReadingRail>
				) : null}
				<article
					aria-label={`About ${project.title}`}
					className="mx-auto w-full min-w-0 max-w-[70ch] min-[801px]:col-start-1 min-[801px]:row-start-1"
				>
					<div
						className="markdown min-w-0 [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_.table-scroll]:max-w-full [&_.table-scroll]:overflow-x-auto"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: Project bodies are locally authored HTML processed by the server content loader.
						dangerouslySetInnerHTML={{ __html: project.html }}
					/>
				</article>
			</div>
			{related ? (
				<section
					aria-labelledby="next-project"
					className="space-y-6 border-t pt-8"
				>
					<h2
						id="next-project"
						className="text-center text-2xl font-semibold tracking-tight min-[801px]:text-left"
					>
						Keep exploring.
					</h2>
					<div className="mx-auto max-w-2xl min-[801px]:mx-0">
						<ProjectCard project={related} compact headingLevel={3} />
					</div>
				</section>
			) : null}
		</div>
	);
}
