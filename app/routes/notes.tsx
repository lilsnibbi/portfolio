import { ArrowRight, NotebookPen } from "lucide-react";
import { Link, useLoaderData } from "react-router";
import config from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { notesLoader } from "../lib/content-context";
import { cn } from "../lib/utils";

export default function Notes() {
	const { notes } = useLoaderData<typeof notesLoader>();
	return (
		<div className="flex flex-col gap-10 min-[801px]:gap-12">
			<PageMeta
				title={`Notes — ${config.profile.name}`}
				description={config.notes.subtitle}
				path="/notes"
			/>
			<PageHeading
				eyebrow="The notebook"
				title={config.notes.title}
				description={config.notes.subtitle}
				className="text-center min-[801px]:text-left max-[800px]:[&_p]:mx-auto"
			/>
			{notes.length ? (
				<div className="space-y-5">
					{notes.map((note) => (
						<article key={note.slug} aria-labelledby={`note-${note.slug}`}>
							<Link
								to={`/notes/${note.slug}`}
								className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
							>
								<Card className="border py-0 shadow-none ring-0 transition-[border-color,box-shadow] duration-200 hover:border-foreground/25 hover:shadow-md motion-reduce:transition-none">
									<CardContent className="flex flex-col items-center gap-5 p-6 text-center min-[801px]:items-start min-[801px]:p-8 min-[801px]:text-left">
										<div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground min-[801px]:justify-start">
											<Badge
												variant="secondary"
												className="h-auto min-h-5 max-w-full whitespace-normal text-center"
											>
												{note.tag}
											</Badge>
											<time dateTime={note.date}>{note.dateLabel}</time>
											<span>{note.readTime} min read</span>
										</div>
										<div className="max-w-2xl space-y-3">
											<h2
												id={`note-${note.slug}`}
												className="text-2xl font-semibold tracking-tight wrap-break-word"
											>
												{note.title}
											</h2>
											<p className="text-sm leading-7 text-muted-foreground">
												{note.description}
											</p>
										</div>
										<span className="inline-flex items-center gap-2 text-sm font-medium">
											Read the note
											<ArrowRight aria-hidden="true" className="size-4" />
										</span>
									</CardContent>
								</Card>
							</Link>
						</article>
					))}
				</div>
			) : (
				<Card className="py-0 shadow-none">
					<CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
						<NotebookPen
							aria-hidden="true"
							className="size-7 text-muted-foreground"
						/>
						<h2 className="text-2xl font-semibold tracking-tight">
							A fresh page.
						</h2>
						<p className="max-w-md text-sm leading-7 text-muted-foreground">
							No notes published just yet. This is where I&apos;ll share small
							discoveries, development notes, and things learned along the way.
						</p>
					</CardContent>
				</Card>
			)}
			<div className="flex flex-col items-center gap-5 border-t pt-8 text-center min-[801px]:flex-row min-[801px]:justify-between min-[801px]:text-left">
				<div className="space-y-2">
					<h2 className="text-xl font-semibold tracking-tight">
						More of a hands-on person?
					</h2>
					<p className="text-sm leading-6 text-muted-foreground">
						Take a look at the projects behind the notes.
					</p>
				</div>
				<Link
					to="/projects"
					className={cn(
						buttonVariants({ variant: "outline" }),
						"min-h-11 shrink-0 transition-none",
					)}
				>
					Explore the work
					<ArrowRight aria-hidden="true" className="size-4" />
				</Link>
			</div>
		</div>
	);
}
