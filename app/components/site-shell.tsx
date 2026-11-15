import {
	ArrowUp,
	BriefcaseBusiness,
	House,
	Mail,
	Monitor,
	NotebookPen,
	UserRound,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import {
	NavLink,
	Link,
	useLocation,
	useNavigate,
	useNavigation,
	useRouteLoaderData,
} from "react-router";
import config from "../../config";
import type { rootLoader } from "../lib/content-context";
import { cn } from "../lib/utils";
import { SocialLinks } from "./social-links";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./ui/tooltip";

const navigation = [
	{ to: "/", label: "Home", icon: House },
	{ to: "/about", label: "About", icon: UserRound },
	{ to: "/uses", label: "Uses", icon: Monitor },
	{ to: "/projects", label: "Projects", icon: BriefcaseBusiness },
	{ to: "/notes", label: "Notes", icon: NotebookPen },
	{ to: "/contact", label: "Contact", icon: Mail },
];
const legacy: Record<string, string> = {
	"#about": "/about",
	"#work": "/projects",
	"#contact": "/contact",
	"#community": "/contact",
};

export function SiteShell({
	children,
	activeNavigation = true,
}: {
	children: ReactNode;
	activeNavigation?: boolean;
}) {
	const location = useLocation();
	const navigate = useNavigate();
	const pending = useNavigation();
	const previousPath = useRef(location.pathname);
	const copyrightYear =
		useRouteLoaderData<typeof rootLoader>("root")?.copyrightYear;

	useEffect(() => {
		const destination =
			location.pathname === "/" ? legacy[location.hash] : undefined;
		if (destination) void navigate(destination, { replace: true });
	}, [location.pathname, location.hash, navigate]);

	useEffect(() => {
		if (previousPath.current === location.pathname) return;
		previousPath.current = location.pathname;
		document.getElementById("main")?.focus({ preventScroll: true });
	}, [location.pathname]);

	return (
		<TooltipProvider delay={250}>
			<div className="relative isolate flex min-h-svh flex-col">
				<div
					aria-hidden="true"
					className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_255_255/0.045),transparent_60%)]"
				/>
				<a
					href="#main"
					className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-foreground px-4 py-3 text-sm text-background focus:translate-y-0"
				>
					Skip to content
				</a>
				<header className="sticky top-0 z-40 flex justify-center px-3 py-3 min-[801px]:py-6">
					<nav
						aria-label="Main navigation"
						className="max-w-full rounded-2xl border bg-background/85 p-1 shadow-lg shadow-black/15 backdrop-blur-xl"
					>
						<ul className="flex items-center gap-0 min-[801px]:gap-1">
							{navigation.map(({ to, label, icon: Icon }) => (
								<li key={to}>
									<Tooltip>
										<TooltipTrigger
											render={
												<NavLink
													to={to}
													end={to === "/"}
													viewTransition
													aria-label={label}
													aria-current={activeNavigation ? "page" : false}
													className="flex size-11 items-center justify-center gap-2 rounded-xl border border-transparent text-sm font-medium text-muted-foreground transition-[background-color,border-color,box-shadow] duration-150 hover:border-border hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:border-border aria-[current=page]:bg-accent aria-[current=page]:text-foreground motion-reduce:transition-none min-[801px]:w-auto min-[801px]:px-3"
												/>
											}
										>
											<Icon className="size-[18px]" aria-hidden="true" />
											<span
												className={
													to === "/"
														? "sr-only"
														: "sr-only min-[801px]:not-sr-only"
												}
											>
												{label}
											</span>
										</TooltipTrigger>
										<TooltipContent
											className="min-[801px]:hidden"
											side="bottom"
										>
											{label}
										</TooltipContent>
									</Tooltip>
								</li>
							))}
						</ul>
					</nav>
				</header>
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: Delegated native anchor clicks include keyboard activation. */}
				<main
					id="main"
					tabIndex={-1}
					aria-busy={pending.state !== "idle"}
					onClick={(event) => {
						if (
							event.defaultPrevented ||
							event.button !== 0 ||
							event.metaKey ||
							event.ctrlKey ||
							event.shiftKey ||
							event.altKey ||
							!(event.target instanceof Element)
						)
							return;
						const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
						if (
							!anchor ||
							anchor.hasAttribute("download") ||
							(anchor.target && anchor.target !== "_self")
						)
							return;
						const target = new URL(anchor.href);
						if (
							target.origin !== window.location.origin ||
							target.pathname !== location.pathname ||
							target.search !== location.search ||
							!target.hash
						)
							return;
						// Server-rendered Markdown links use the same scroll owner as JSX links.
						event.preventDefault();
						void navigate({
							pathname: target.pathname,
							search: target.search,
							hash: target.hash,
						});
					}}
					className={cn(
						"mx-auto w-full max-w-portfolio flex-1 px-6 pt-4 pb-8 outline-none sm:px-8",
						location.pathname === "/about" && "min-[1280px]:max-w-[80rem]",
					)}
				>
					{children}
				</main>
				<footer
					className={cn(
						"mx-auto mt-12 flex w-[calc(100%_-_3rem)] max-w-[calc(var(--container-portfolio)_-_4rem)] flex-col items-center gap-5 border-t pt-8 pb-[calc(3rem_+_env(safe-area-inset-bottom))] text-center sm:w-[calc(100%_-_4rem)] min-[801px]:flex-row min-[801px]:justify-between min-[801px]:pb-16",
						location.pathname === "/about" && "min-[1280px]:max-w-[76rem]",
					)}
				>
					<p className="text-sm text-muted-foreground">
						© {copyrightYear} {config.footer.copyrightName}
						<span className="mt-1 block min-[801px]:mt-0 min-[801px]:inline">
							{" "}
							/ Built with a little curiosity.
						</span>
					</p>
					<div className="flex items-center gap-2">
						<SocialLinks className="[&_a]:border-transparent [&_a]:bg-transparent" />
						<Link
							to={{
								pathname: location.pathname,
								search: location.search,
								hash: "#top",
							}}
							aria-label="Back to top"
							className="flex size-10 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
						>
							<ArrowUp className="size-4" aria-hidden="true" />
						</Link>
					</div>
				</footer>
			</div>
		</TooltipProvider>
	);
}
