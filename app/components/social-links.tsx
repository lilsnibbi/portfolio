import { ExternalLink } from "lucide-react";
import config from "../../config";
import { cn } from "../lib/utils";
import { ConfigIcon } from "./config-icon";
import { buttonVariants } from "./ui/button";

export function SocialLinks({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-center gap-2",
				className,
			)}
		>
			{config.profile.socials.links.map((social) => (
				<a
					key={social.platform}
					href={social.url}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`${social.platform} (opens in a new tab)`}
					className={buttonVariants({
						variant: "outline",
						className: "min-h-10 gap-2 px-3 text-sm",
					})}
				>
					<ConfigIcon
						image={social.icon}
						fallback={
							["GitHub", "Discord"].includes(social.platform) ? (
								<svg viewBox="0 0 24 24" aria-hidden="true">
									<use
										href={`/public/img/technologies.svg#${social.platform.toLowerCase()}`}
									/>
								</svg>
							) : (
								<ExternalLink />
							)
						}
					/>
					{social.platform}
				</a>
			))}
		</div>
	);
}
