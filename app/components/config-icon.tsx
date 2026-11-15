import type { ReactNode } from "react";
import type { ImageSource } from "../../config";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export function ConfigIcon({
	image,
	fallback,
	className,
}: {
	image?: ImageSource;
	fallback: ReactNode;
	className?: string;
}) {
	return (
		<Avatar
			aria-hidden="true"
			className={cn("size-4 rounded-none after:hidden", className)}
		>
			{image?.url.trim() ? (
				<AvatarImage
					src={image.url}
					alt=""
					className="rounded-none object-contain"
					referrerPolicy="no-referrer"
				/>
			) : null}
			<AvatarFallback className="rounded-none bg-transparent text-current [&_svg]:size-full">
				{fallback}
			</AvatarFallback>
		</Avatar>
	);
}
