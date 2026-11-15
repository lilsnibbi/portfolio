import config, { type ImageSource } from "../../config";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function SiteAvatar({
	size = "sm",
	className,
}: {
	size?: "sm" | "lg";
	className?: string;
}) {
	const image: ImageSource = config.profile.avatar;
	return (
		<Avatar
			className={cn(
				size === "lg" ? "size-24 min-[801px]:size-28" : "size-8",
				className,
			)}
		>
			{image.url.trim() ? (
				<AvatarImage
					src={image.url}
					alt={image.alt ?? config.profile.name}
					referrerPolicy="no-referrer"
					width={size === "lg" ? 112 : 32}
					height={size === "lg" ? 112 : 32}
				/>
			) : null}
			<AvatarFallback
				className={cn(
					"bg-secondary font-semibold text-foreground",
					size === "lg" ? "text-4xl" : "text-sm",
				)}
			>
				{config.profile.name.charAt(0)}
			</AvatarFallback>
		</Avatar>
	);
}
