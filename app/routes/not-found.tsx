import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router";
import config from "../../config";
import { PageHeading } from "../components/page-heading";
import { PageMeta } from "../components/page-meta";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/utils";

export default function NotFound() {
	const { pathname } = useLocation();
	return (
		<div className="py-16 text-center min-[801px]:text-left">
			<PageMeta
				title={`Page not found — ${config.profile.name}`}
				description="This page could not be found."
				path={pathname}
				noIndex
			/>
			<PageHeading
				eyebrow="404"
				title="A little off the beaten path."
				description="That page doesn't exist. Let's get you back to somewhere familiar."
				className="text-center min-[801px]:text-left max-[800px]:[&_p]:mx-auto"
			/>
			<Link
				to="/"
				className={cn(
					buttonVariants({ variant: "outline" }),
					"min-h-11 transition-none",
				)}
			>
				<ArrowLeft aria-hidden="true" className="size-4" />
				Back home
			</Link>
		</div>
	);
}
