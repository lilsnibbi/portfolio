import { ArrowRight } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import config from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { ProjectCard } from "../components/project-card";
import { buttonVariants } from "../components/ui/button";
import type { projectsLoader } from "../lib/content-context";
import { cn } from "../lib/utils";

export default function Projects() {
	const { featured, more, count } = useLoaderData<typeof projectsLoader>();

	return (
		<div className="flex flex-col gap-12">
			<PageMeta
				title={`Projects — ${config.profile.name}`}
				description={config.projects.subtitle}
				path="/projects"
			/>
			<PageHeading
				eyebrow={`${config.projects.sectionTag} / ${String(count).padStart(2, "0")} projects`}
				title={config.projects.title}
				description={config.projects.subtitle}
				className="text-center min-[801px]:text-left max-[800px]:[&_p]:mx-auto"
			/>
			{featured.length ? (
				<div className="space-y-8">
					{featured.map((project, index) => (
						<ProjectCard
							key={project.slug}
							project={project}
							priority={index === 0}
						/>
					))}
				</div>
			) : null}
			{more.length ? (
				<section aria-labelledby="more-projects" className="space-y-6">
					<h2
						id="more-projects"
						className="text-center text-2xl font-semibold tracking-tight min-[801px]:text-left"
					>
						{featured.length
							? "More from the workbench."
							: "From the workbench."}
					</h2>
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{more.map((project, index) => (
							<ProjectCard
								key={project.slug}
								project={project}
								compact
								headingLevel={3}
								priority={!featured.length && index === 0}
							/>
						))}
					</div>
				</section>
			) : null}
			{count === 0 ? (
				<p className="text-center text-muted-foreground">
					Project write-ups are on the way. Come back soon to see what I&apos;m
					building.
				</p>
			) : null}
			<div className="flex flex-col items-center gap-5 border-t pt-8 text-center min-[801px]:flex-row min-[801px]:justify-between min-[801px]:text-left">
				<div className="space-y-2">
					<h2 className="text-xl font-semibold tracking-tight">
						Good things start with a conversation.
					</h2>
					<p className="text-sm leading-6 text-muted-foreground">
						Got an idea, a question, or something to build?
					</p>
				</div>
				<Link
					to="/contact"
					className={cn(
						buttonVariants({ variant: "outline" }),
						"min-h-11 shrink-0 transition-none",
					)}
				>
					Get in touch
					<ArrowRight aria-hidden="true" className="size-4" />
				</Link>
			</div>
		</div>
	);
}
