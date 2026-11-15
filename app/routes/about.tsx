import { ArrowRight } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import config from "../../config";
import { LiveClock } from "../components/live-clock";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { ReadingRail } from "../components/reading-rail";
import { SiteAvatar } from "../components/site-avatar";
import { SocialLinks } from "../components/social-links";
import { TableOfContents } from "../components/table-of-contents";
import { TechnologyIcon } from "../components/technology-badge";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { aboutLoader } from "../lib/content-context";
import { cn } from "../lib/utils";

const contents = [
	{ id: "introduction", label: "Introduction" },
	{ id: "approach", label: "How I like to build" },
	{ id: "toolkit", label: "My toolkit" },
];

const principles = [
	{
		number: "01",
		title: "Make it dependable.",
		description:
			"Backend systems, infrastructure, and the details that keep things running.",
	},
	{
		number: "02",
		title: "Keep it useful.",
		description:
			"Developer tools that solve real problems and make complicated things feel simple.",
	},
	{
		number: "03",
		title: "Bring people together.",
		description:
			"Software and communities that make a little more room for connection.",
	},
];

const profileDetails = [
	{ label: "Based in", value: config.profile.location },
	{ label: "Pronouns", value: config.profile.pronouns },
	{ label: "Age", value: config.profile.age },
];

const experience = config.about.experience;

const toolkit = Array.from(
	new Map(
		[...config.uses.languages, ...config.uses.development].map((tool) => [
			tool.name,
			tool,
		]),
	).values(),
);

export default function About() {
	const loaderData = useLoaderData<typeof aboutLoader>();
	return (
		<>
			<PageMeta
				title={`About — ${config.profile.name}`}
				description={config.about.lead}
				path="/about"
			/>
			<div className="grid gap-12 min-[801px]:grid-cols-[minmax(0,1fr)_12rem] min-[801px]:gap-x-8 min-[1280px]:grid-cols-[16rem_minmax(0,1fr)_12rem] min-[1280px]:gap-x-12">
				<aside
					data-profile-rail
					aria-labelledby="profile-name"
					className="mx-auto w-full min-w-0 max-w-sm self-start min-[801px]:col-start-1 min-[801px]:row-start-1 min-[1280px]:sticky min-[1280px]:top-[var(--anchor-offset)] min-[1280px]:max-h-[calc(100dvh-var(--anchor-offset)-1rem)] min-[1280px]:overflow-y-auto min-[1280px]:scroll-py-2 min-[1280px]:p-1.5 min-[1280px]:[scrollbar-width:thin]"
				>
					<Card className="gap-0 py-0 shadow-none">
						<CardContent className="flex flex-col items-center px-5 py-6 text-center">
							<SiteAvatar size="lg" className="mx-auto" />
							<p
								id="profile-name"
								className="mt-4 text-2xl font-semibold tracking-tight"
							>
								{config.profile.name}
							</p>
							<p className="mt-1 text-sm leading-6 text-muted-foreground">
								{config.profile.role}
							</p>

							<dl className="mt-6 w-full space-y-3 border-t pt-5 text-sm">
								{profileDetails.map((detail) => (
									<div
										key={detail.label}
										className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3"
									>
										<dt className="text-left text-muted-foreground">
											{detail.label}
										</dt>
										<dd className="min-w-0 wrap-break-word text-right font-medium">
											{detail.value}
										</dd>
									</div>
								))}
								<div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
									<dt className="text-left text-muted-foreground">
										Current time
									</dt>
									<dd className="min-w-0 text-right">
										<LiveClock
											timeZone={config.profile.timeZone}
											initialTime={loaderData.now}
										/>
									</dd>
								</div>
							</dl>

							<div className="mt-6 flex w-full flex-col items-center gap-3 border-t pt-5">
								<p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
									{config.profile.socials.title}
								</p>
								<SocialLinks className="w-full justify-center!" />
							</div>
						</CardContent>
					</Card>
				</aside>
				<ReadingRail className="min-[801px]:col-start-2 min-[801px]:row-span-2 min-[801px]:row-start-1 min-[1280px]:col-start-3 min-[1280px]:row-span-1">
					<TableOfContents
						items={contents}
						title="On this page"
						className="w-full text-center [&_a]:justify-center [&_a]:text-center"
					/>
				</ReadingRail>
				<div className="flex min-w-0 flex-col gap-12 text-center min-[801px]:col-start-1 min-[801px]:row-start-2 min-[801px]:gap-16 min-[801px]:text-left min-[1280px]:col-start-2 min-[1280px]:row-start-1">
					<div
						id="introduction"
						className="flex scroll-mt-[var(--anchor-offset)] flex-col gap-8"
					>
						<PageHeading
							eyebrow={config.about.title}
							title={
								<>
									A curious mind.
									<br />
									<span className="text-muted-foreground">
										A builder at heart.
									</span>
								</>
							}
							description={config.about.lead}
						/>
						<div className="flex flex-col gap-6 text-base leading-8 text-muted-foreground">
							{config.about.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</div>

					<section
						id="approach"
						aria-labelledby="approach-title"
						className="flex scroll-mt-[var(--anchor-offset)] flex-col gap-7 border-t pt-10"
					>
						<div className="space-y-2">
							<p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
								The approach
							</p>
							<h2
								id="approach-title"
								className="text-2xl font-semibold tracking-tight"
							>
								How I like to build.
							</h2>
						</div>
						<ol className="space-y-8">
							{principles.map((principle) => (
								<li
									key={principle.number}
									className="flex flex-col items-center gap-3 min-[801px]:flex-row min-[801px]:items-start min-[801px]:gap-4"
								>
									<span
										aria-hidden="true"
										className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50 font-mono text-xs text-muted-foreground"
									>
										{principle.number}
									</span>
									<div className="space-y-2">
										<h3 className="font-medium">{principle.title}</h3>
										<p className="text-base leading-7 text-muted-foreground">
											{principle.description}
										</p>
									</div>
								</li>
							))}
						</ol>
					</section>

					<section
						id="toolkit"
						aria-labelledby="toolkit-title"
						className="flex scroll-mt-[var(--anchor-offset)] flex-col gap-6 border-t pt-10"
					>
						<div className="flex flex-wrap items-center justify-center gap-3 min-[801px]:justify-between">
							<h2
								id="toolkit-title"
								className="text-2xl font-semibold tracking-tight"
							>
								My toolkit.
							</h2>
							{experience && (
								<Badge variant="outline" className="font-normal">
									{experience} building
								</Badge>
							)}
						</div>
						<p className="text-sm leading-6 text-muted-foreground">
							The languages and tools I reach for.
						</p>
						<ul
							aria-label="My toolkit"
							className="flex flex-wrap justify-center gap-2 min-[801px]:justify-start"
						>
							{toolkit.map((tool) => (
								<li key={tool.name}>
									<Badge
										variant="outline"
										className="h-auto min-h-10 gap-2 px-3 py-2 font-normal"
									>
										<TechnologyIcon
											name={tool.name}
											image={tool.icon}
											className="size-4 shrink-0 object-contain"
										/>
										{tool.name}
									</Badge>
								</li>
							))}
						</ul>
						<Link
							to="/uses"
							className={cn(
								buttonVariants({ variant: "outline", size: "sm" }),
								"h-auto min-h-11 max-w-full self-center whitespace-normal text-center transition-none min-[801px]:self-start",
							)}
						>
							All my tools &amp; setup
							<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
						</Link>
					</section>

					<div className="flex flex-col items-center gap-5 border-t pt-10 min-[801px]:flex-row min-[801px]:justify-between">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold">Enough about me.</h2>
							<p className="text-sm text-muted-foreground">
								Have something you&apos;re working on?
							</p>
						</div>
						<Link
							to="/contact"
							className={cn(
								buttonVariants({ variant: "outline" }),
								"min-h-11 shrink-0 transition-none",
							)}
						>
							Let&apos;s talk
							<ArrowRight aria-hidden="true" className="size-4" />
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}
