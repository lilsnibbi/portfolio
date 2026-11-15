import {
	ArrowRight,
	BriefcaseBusiness,
	NotebookPen,
	UserRound,
} from "lucide-react";
import { Link } from "react-router";
import config from "../../config";
import { PageMeta } from "../components/page-meta";
import { SiteAvatar } from "../components/site-avatar";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { cn } from "../lib/utils";

const destinations = [
	{
		to: "/about",
		title: "The person.",
		description:
			"A bit of background, what makes me tick, and life away from the editor.",
		label: "Get to know me",
		icon: UserRound,
	},
	{
		to: "/projects",
		title: "The projects.",
		description:
			"Developer tools, community projects, and ideas turned into working software.",
		label: "See what I'm building",
		icon: BriefcaseBusiness,
	},
	{
		to: "/notes",
		title: "The notebook.",
		description:
			"Small discoveries, development notes, and thoughts along the way.",
		label: "Read the notes",
		icon: NotebookPen,
	},
];

export default function Home() {
	return (
		<>
			<PageMeta
				title={config.site.title}
				description={config.site.description}
				path="/"
			/>
			<div className="flex flex-col gap-12 min-[801px]:gap-16">
				<section
					aria-labelledby="home-title"
					className="flex flex-col items-center text-center min-[801px]:items-start min-[801px]:text-left"
				>
					<div className="inline-flex max-w-full items-center gap-3 rounded-full border bg-card px-3 py-2 text-sm text-muted-foreground">
						<SiteAvatar size="sm" className="shrink-0" />
						<span>{config.profile.role}</span>
					</div>
					<h1
						id="home-title"
						className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl min-[801px]:text-6xl"
					>
						Hey, I&apos;m {config.profile.name}.
					</h1>
					<p className="mt-5 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
						{config.profile.bio}
					</p>
					<div className="mt-8 flex w-full flex-wrap justify-center gap-3 min-[801px]:justify-start">
						<Link
							to="/projects"
							className={cn(
								buttonVariants({ variant: "default" }),
								"h-auto min-h-11 max-w-full whitespace-normal text-center transition-none",
							)}
						>
							Explore my projects
							<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
						</Link>
						<Link
							to="/about"
							className={cn(
								buttonVariants({ variant: "outline" }),
								"h-auto min-h-11 max-w-full whitespace-normal text-center transition-none",
							)}
						>
							A little about me
						</Link>
					</div>
				</section>

				<nav aria-label="Explore the site">
					<ul className="grid gap-4 min-[801px]:grid-cols-3">
						{destinations.map((destination) => (
							<li key={destination.to} className="min-w-0">
								<Link
									to={destination.to}
									className="block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
								>
									<Card className="h-full py-0 shadow-none transition-none hover:border-foreground/25 hover:bg-accent/50">
										<CardContent className="flex h-full flex-col items-center gap-4 p-6 text-center min-[801px]:items-start min-[801px]:text-left">
											<span className="inline-flex size-11 items-center justify-center rounded-lg border bg-background">
												<destination.icon
													aria-hidden="true"
													className="size-5"
												/>
											</span>
											<div className="space-y-2">
												<h2 className="text-xl font-semibold tracking-tight">
													{destination.title}
												</h2>
												<p className="text-sm leading-6 text-muted-foreground">
													{destination.description}
												</p>
											</div>
											<span className="mt-auto inline-flex items-center justify-center gap-2 pt-3 text-sm font-medium min-[801px]:justify-start">
												{destination.label}
												<ArrowRight
													aria-hidden="true"
													className="size-4 shrink-0"
												/>
											</span>
										</CardContent>
									</Card>
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<div className="flex flex-col items-center gap-2 border-t pt-8 text-center min-[801px]:flex-row min-[801px]:justify-between min-[801px]:text-left">
					<p className="text-sm text-muted-foreground">
						Something on your mind?
					</p>
					<Link
						to="/contact"
						className={cn(
							buttonVariants({ variant: "ghost", size: "sm" }),
							"min-h-11 transition-none",
						)}
					>
						Let&apos;s talk
						<ArrowRight aria-hidden="true" className="size-4" />
					</Link>
				</div>
			</div>
		</>
	);
}
