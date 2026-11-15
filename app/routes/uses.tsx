import { ArrowRight, ChevronDown } from "lucide-react";
import { Link } from "react-router";
import config, { type Specification, type Tool } from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { ReadingRail } from "../components/reading-rail";
import { TableOfContents } from "../components/table-of-contents";
import { TechnologyIcon } from "../components/technology-badge";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { cn } from "../lib/utils";

const contents = [
	{ id: "languages", label: "Languages" },
	{ id: "development", label: "Development tools" },
	{ id: "infrastructure", label: "Infrastructure" },
	{ id: "pc", label: "My PC & hardware" },
	{ id: "software", label: "Software" },
];

function ToolTile({ tool }: { tool: Tool }) {
	const description = tool.description?.trim();
	const label = (
		<>
			<TechnologyIcon
				name={tool.name}
				image={tool.icon}
				className="size-5 shrink-0 object-contain"
			/>
			<span className="min-w-0 flex-1 wrap-break-word">{tool.name}</span>
		</>
	);
	return (
		<Card className="gap-0 rounded-xl py-0 shadow-none transition-[border-color] duration-150 hover:border-foreground/25 motion-reduce:transition-none">
			<CardContent className="p-0">
				{description ? (
					<details className="group/tool">
						<summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
							{label}
							<ChevronDown
								aria-hidden="true"
								className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-open/tool:rotate-180 motion-reduce:transition-none"
							/>
						</summary>
						<p className="border-t px-3 py-3 text-left text-sm leading-6 text-muted-foreground">
							{description}
						</p>
					</details>
				) : (
					<div className="flex min-h-14 items-center gap-2 px-3 py-3 text-left text-sm font-medium">
						{label}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ToolSection({
	id,
	title,
	description,
	tools,
}: {
	id: string;
	title: string;
	description: string;
	tools: Tool[];
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className="scroll-mt-[var(--anchor-offset)] space-y-6"
		>
			<div className="space-y-2 text-center min-[801px]:text-left">
				<h2
					id={`${id}-title`}
					className="text-2xl font-semibold tracking-tight"
				>
					{title}
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">{description}</p>
			</div>
			{tools.length > 0 ? (
				<ul className="grid grid-cols-1 items-start gap-3 min-[375px]:grid-cols-2 min-[1100px]:grid-cols-3">
					{tools.map((tool) => (
						<li key={tool.name} className="min-w-0">
							<ToolTile tool={tool} />
						</li>
					))}
				</ul>
			) : (
				<p className="text-center text-sm leading-6 text-muted-foreground min-[801px]:text-left">
					No tools have been added to this section yet.
				</p>
			)}
		</section>
	);
}

function SpecificationSection({
	id,
	title,
	description,
	items,
	emptyMessage,
}: {
	id: string;
	title: string;
	description: string;
	items: Specification[];
	emptyMessage: string;
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className="scroll-mt-[var(--anchor-offset)] space-y-6"
		>
			<div className="space-y-2 text-center min-[801px]:text-left">
				<h2
					id={`${id}-title`}
					className="text-2xl font-semibold tracking-tight"
				>
					{title}
				</h2>
				<p className="text-sm leading-6 text-muted-foreground">{description}</p>
			</div>
			<Card className="py-0 shadow-none">
				<CardContent className="p-5 min-[801px]:p-6">
					{items.length > 0 ? (
						<dl className="divide-y">
							{items.map((item) => (
								<div
									key={item.label}
									className="flex flex-col items-center gap-1 py-4 text-center first:pt-0 last:pb-0 min-[801px]:grid min-[801px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] min-[801px]:items-start min-[801px]:gap-6"
								>
									<dt className="text-sm text-muted-foreground min-[801px]:text-left">
										{item.label}
									</dt>
									<dd className="min-w-0 wrap-break-word text-sm font-medium min-[801px]:text-right">
										{item.value}
									</dd>
								</div>
							))}
						</dl>
					) : (
						<p className="text-center text-sm leading-6 text-muted-foreground min-[801px]:text-left">
							{emptyMessage}
						</p>
					)}
				</CardContent>
			</Card>
		</section>
	);
}

export default function Uses() {
	return (
		<>
			<PageMeta
				title={`Uses — ${config.profile.name}`}
				description={config.uses.description}
				path="/uses"
			/>
			<div className="flex flex-col gap-12 min-[801px]:gap-14">
				<PageHeading
					eyebrow="The everyday workbench"
					title={
						<>
							The tools.
							<br />
							<span className="text-muted-foreground">The setup.</span>
						</>
					}
					description={config.uses.description}
				/>

				<div className="grid items-start gap-10 min-[801px]:grid-cols-[minmax(0,1fr)_13rem] min-[801px]:gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_14rem] min-[1100px]:gap-16">
					<ReadingRail className="min-[801px]:col-start-2 min-[801px]:row-start-1">
						<TableOfContents
							items={contents}
							title="What I use"
							className="w-full text-center [&_a]:justify-center [&_a]:text-center"
						/>
					</ReadingRail>
					<div className="flex min-w-0 flex-col gap-14 min-[801px]:col-start-1 min-[801px]:row-start-1 min-[801px]:gap-16">
						<ToolSection
							id="languages"
							title="Languages."
							description="The languages I use and know."
							tools={config.uses.languages}
						/>
						<ToolSection
							id="development"
							title="Development tools."
							description="The runtimes, databases, and tools in my stack."
							tools={config.uses.development}
						/>
						<SpecificationSection
							id="infrastructure"
							title="Infrastructure."
							description="The systems and hardware behind the scenes."
							items={config.uses.infrastructure}
							emptyMessage="Infrastructure specifications haven't been added yet."
						/>
						<SpecificationSection
							id="pc"
							title="My PC & hardware."
							description="The machine, peripherals, and setup at my desk."
							items={config.uses.pc}
							emptyMessage="PC and hardware specifications haven't been added yet."
						/>
						<ToolSection
							id="software"
							title="Everyday software."
							description="The apps I use for projects, community, and everything around them."
							tools={config.uses.software}
						/>
					</div>
				</div>

				<div className="flex flex-col items-center gap-5 border-t pt-8 text-center min-[801px]:flex-row min-[801px]:justify-between min-[801px]:text-left">
					<div className="space-y-1">
						<h2 className="text-lg font-semibold">
							What am I building with it?
						</h2>
						<p className="text-sm text-muted-foreground">
							Take a look at the tools in practice.
						</p>
					</div>
					<Link
						to="/projects"
						className={cn(
							buttonVariants({ variant: "outline" }),
							"h-auto min-h-11 max-w-full shrink-0 whitespace-normal text-center transition-none",
						)}
					>
						Explore my projects
						<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
					</Link>
				</div>
			</div>
		</>
	);
}
