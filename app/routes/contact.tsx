import { ExternalLink, MessageCircle } from "lucide-react";
import { useLoaderData } from "react-router";
import config from "../../config";
import { ContactForm } from "../components/contact-form";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { Badge } from "../components/ui/badge";
import { buttonVariants } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import type { contactLoader } from "../lib/content-context";

export default function Contact() {
	const loaderData = useLoaderData<typeof contactLoader>();
	const discordUrl =
		config.profile.socials.links.find((link) => link.platform === "Discord")
			?.url ?? config.contact.website;
	return (
		<div className="flex flex-col gap-12">
			<PageMeta
				title={`Contact — ${config.profile.name}`}
				description={config.contact.subtitle}
				path="/contact"
			/>
			<PageHeading
				eyebrow="Get in touch"
				title={
					<>
						Good things start
						<br />
						<span className="text-muted-foreground">with a hello.</span>
					</>
				}
				description={config.contact.subtitle}
			/>
			<div className="grid items-start gap-8 min-[801px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
				<ContactForm siteKey={loaderData.siteKey} discordUrl={discordUrl} />
				<aside
					aria-label="Other ways to connect"
					className="space-y-8 text-center min-[801px]:text-left"
				>
					<section>
						<MessageCircle
							className="mx-auto mb-5 size-7 text-muted-foreground min-[801px]:mx-0"
							aria-hidden="true"
						/>
						<h2 className="text-xl font-semibold tracking-tight">
							More of a Discord person?
						</h2>
						<p className="mt-3 text-base leading-relaxed text-muted-foreground">
							You'll find me there as{" "}
							<strong className="font-medium text-foreground">
								{config.contact.discord}
							</strong>
							. Say hello or come hang out with the community.
						</p>
						<a
							href={config.contact.website}
							target="_blank"
							rel="noopener noreferrer"
							className={buttonVariants({
								variant: "outline",
								className: "mt-5 min-h-11 gap-2 px-4",
							})}
						>
							Find me on Discord{" "}
							<ExternalLink className="size-4" aria-hidden="true" />
						</a>
					</section>
					<Card>
						<CardContent className="space-y-4 p-6">
							<p className="font-mono text-sm text-muted-foreground">
								A little corner of the internet
							</p>
							<h2 className="text-xl font-semibold">
								{config.contact.community.title}
							</h2>
							<p className="text-sm leading-relaxed text-muted-foreground">
								{config.contact.community.description}
							</p>
							<div className="flex flex-wrap items-center justify-center gap-3 min-[801px]:justify-start">
								<Badge variant="outline">
									{config.contact.community.members}
								</Badge>
								<a
									href={discordUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-sm font-medium underline-offset-4 hover:underline"
								>
									Come say hello
								</a>
							</div>
						</CardContent>
					</Card>
				</aside>
			</div>
		</div>
	);
}
