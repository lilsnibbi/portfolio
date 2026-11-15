import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "../lib/utils";

type ContentItem = { id: string; label: string; level?: number };

export function TableOfContents({
	items,
	title = "On this page",
	className,
}: {
	items: ContentItem[];
	title?: string;
	className?: string;
}) {
	const [active, setActive] = useState(items[0]?.id);
	const location = useLocation();
	const anchorIntent = useRef<string | null>(null);
	const scrollingToAnchor = useRef(false);

	useEffect(() => {
		let frame = 0;
		const readHash = () => {
			let id: string;
			try {
				id = decodeURIComponent(window.location.hash.slice(1));
			} catch {
				id = "";
			}
			anchorIntent.current = items.some((item) => item.id === id) ? id : null;
			scrollingToAnchor.current = anchorIntent.current !== null;
		};
		const update = () => {
			frame = 0;
			const main = document.getElementById("main");
			const offset = main
				? Number.parseFloat(getComputedStyle(main).scrollMarginBlockStart)
				: 96;
			const threshold = (Number.isFinite(offset) ? offset : 96) + 12;
			const requested = anchorIntent.current
				? document.getElementById(anchorIntent.current)
				: null;
			if (scrollingToAnchor.current && requested && anchorIntent.current) {
				const maximum = Math.max(
					0,
					document.documentElement.scrollHeight - window.innerHeight,
				);
				const destination = Math.min(
					maximum,
					Math.max(
						0,
						requested.getBoundingClientRect().top +
							window.scrollY -
							(threshold - 12),
					),
				);
				setActive(anchorIntent.current);
				if (Math.abs(window.scrollY - destination) <= 2)
					scrollingToAnchor.current = false;
				return;
			}
			let current = items[0]?.id;
			for (const item of items) {
				const element = document.getElementById(item.id);
				if (element && element.getBoundingClientRect().top <= threshold)
					current = item.id;
			}
			const atEnd =
				window.scrollY > 0 &&
				Math.ceil(window.scrollY + window.innerHeight) >=
					document.documentElement.scrollHeight - 1;
			if (atEnd) {
				const top = requested?.getBoundingClientRect().top;
				// Native anchors can be clamped before reaching the reading line.
				current =
					top !== undefined && top >= threshold - 14 && top < window.innerHeight
						? (anchorIntent.current ?? current)
						: items.at(-1)?.id;
			}
			setActive(current);
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		const followHash = () => {
			readHash();
			schedule();
		};
		const releaseAnchor = () => {
			anchorIntent.current = null;
			scrollingToAnchor.current = false;
		};
		const finishScroll = () => {
			scrollingToAnchor.current = false;
			schedule();
		};
		const resize = () => {
			scrollingToAnchor.current = false;
			schedule();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (
				!event.defaultPrevented &&
				[
					"ArrowUp",
					"ArrowDown",
					"PageUp",
					"PageDown",
					"Home",
					"End",
					" ",
				].includes(event.key)
			)
				releaseAnchor();
		};
		readHash();
		update();
		window.addEventListener("scroll", schedule, { passive: true });
		window.addEventListener("resize", resize, { passive: true });
		window.addEventListener("hashchange", followHash);
		window.addEventListener("popstate", followHash);
		window.addEventListener("wheel", releaseAnchor, { passive: true });
		window.addEventListener("touchstart", releaseAnchor, { passive: true });
		window.addEventListener("keydown", onKeyDown);
		document.addEventListener("scrollend", finishScroll);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", schedule);
			window.removeEventListener("resize", resize);
			window.removeEventListener("hashchange", followHash);
			window.removeEventListener("popstate", followHash);
			window.removeEventListener("wheel", releaseAnchor);
			window.removeEventListener("touchstart", releaseAnchor);
			window.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("scrollend", finishScroll);
		};
	}, [items]);

	if (!items.length) return null;
	return (
		<nav aria-label={title} className={cn("text-center", className)}>
			<p className="mb-6 font-mono text-sm text-muted-foreground">{title}</p>
			<ul className="flex flex-wrap justify-center gap-2 min-[801px]:flex-col">
				{items.map((item) => (
					<li key={item.id}>
						<Link
							to={{
								pathname: location.pathname,
								search: location.search,
								hash: `#${item.id}`,
							}}
							onClick={(event) => {
								if (
									event.defaultPrevented ||
									event.button !== 0 ||
									event.metaKey ||
									event.ctrlKey ||
									event.shiftKey ||
									event.altKey
								)
									return;
								anchorIntent.current = item.id;
								scrollingToAnchor.current = true;
								setActive(item.id);
							}}
							aria-current={active === item.id ? "location" : undefined}
							className={cn(
								"flex min-h-11 items-center justify-center rounded-lg border px-3 py-2.5 text-sm leading-relaxed transition-[background-color,border-color] duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none min-[801px]:text-[15px]",
								active === item.id
									? "border-border bg-accent text-foreground"
									: "border-transparent text-muted-foreground",
								item.level === 3 && "min-[801px]:text-sm",
							)}
						>
							{item.label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
