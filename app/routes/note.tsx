import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import config from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { ReadingRail } from "../components/reading-rail";
import { SiteAvatar } from "../components/site-avatar";
import { TableOfContents } from "../components/table-of-contents";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import type { noteLoader } from "../lib/content-context";
import { cn } from "../lib/utils";

export default function Note() {
	const { note, dateLabel } = useLoaderData<typeof noteLoader>();
	const contents = note.headings
		.filter((heading) => heading.level <= 3)
		.map((heading) => ({
			id: heading.id,
			label: heading.text,
			level: heading.level,
		}));

	return (
		<div className="flex flex-col gap-10 min-[801px]:gap-12">
			<PageMeta
				title={`${note.title} — ${config.profile.name}`}
				description={note.description}
				path={`/notes/${note.slug}`}
			/>
			<div className="flex flex-col gap-6 text-center min-[801px]:text-left">
				<Link
					to="/notes"
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"min-h-11 self-center transition-none min-[801px]:self-start",
					)}
				>
					<ArrowLeft aria-hidden="true" className="size-4" />
					All notes
				</Link>
				<div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground min-[801px]:justify-start">
					<Badge
						variant="secondary"
						className="h-auto min-h-5 max-w-full whitespace-normal text-center"
					>
						{note.tag}
					</Badge>
					<time dateTime={note.date}>{dateLabel}</time>
					<span>{note.readTime} min read</span>
				</div>
				<PageHeading title={note.title} description={note.description} />
				<div className="flex flex-wrap items-center justify-center gap-3 text-sm min-[801px]:justify-start">
					<SiteAvatar size="sm" className="shrink-0" />
					<span>
						{config.profile.name}
						<span className="text-muted-foreground">
							{" "}
							/ Developer &amp; tinkerer
						</span>
					</span>
				</div>
			</div>
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
							title="In this note"
							className="max-[800px]:text-center max-[800px]:[&_a]:justify-center max-[800px]:[&_a]:text-center"
						/>
					</ReadingRail>
				) : null}
				<article
					aria-label={note.title}
					className="mx-auto w-full min-w-0 max-w-[70ch] min-[801px]:col-start-1 min-[801px]:row-start-1"
				>
					<div
						className="markdown min-w-0 [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_.table-scroll]:max-w-full [&_.table-scroll]:overflow-x-auto"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: parseNote renders Markdown with raw HTML disabled and validates link and image protocols.
						dangerouslySetInnerHTML={{ __html: note.html }}
					/>
				</article>
			</div>
			<div className="flex flex-col items-center gap-5 border-t pt-8 text-center min-[801px]:flex-row min-[801px]:justify-between min-[801px]:text-left">
				<div className="space-y-2">
					<h2 className="text-xl font-semibold tracking-tight">
						Thanks for reading.
					</h2>
					<p className="text-sm leading-6 text-muted-foreground">
						Have a thought or a question about this?
					</p>
				</div>
				<Link
					to="/contact"
					className={cn(
						buttonVariants({ variant: "outline" }),
						"min-h-11 shrink-0 transition-none",
					)}
				>
					Let&apos;s chat
					<ArrowRight aria-hidden="true" className="size-4" />
				</Link>
			</div>
		</div>
	);
}
