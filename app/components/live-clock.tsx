import { useEffect, useMemo, useState } from "react";

export function LiveClock({
	timeZone,
	initialTime,
}: {
	timeZone: string;
	initialTime: string;
}) {
	const [now, setNow] = useState(initialTime);
	const formats = useMemo(
		() => ({
			day: new Intl.DateTimeFormat("en-AU", { timeZone, weekday: "long" }),
			date: new Intl.DateTimeFormat("en-AU", {
				timeZone,
				day: "numeric",
				month: "short",
				year: "numeric",
			}),
			time: new Intl.DateTimeFormat("en-AU", {
				timeZone,
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
				timeZoneName: "short",
			}),
		}),
		[timeZone],
	);

	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const update = () => {
			clearTimeout(timer);
			if (document.hidden) return;
			setNow(new Date().toISOString());
			timer = setTimeout(update, 60_000 - (Date.now() % 60_000) + 50);
		};
		update();
		document.addEventListener("visibilitychange", update);
		return () => {
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", update);
		};
	}, []);

	const date = new Date(now);
	return (
		<time
			dateTime={now}
			title={timeZone}
			className="grid gap-0.5 text-sm leading-relaxed tabular-nums"
		>
			<span className="text-muted-foreground">{formats.day.format(date)}</span>
			<span className="text-muted-foreground">{formats.date.format(date)}</span>
			<span className="whitespace-nowrap font-medium">
				{formats.time.format(date).toUpperCase()}
			</span>
		</time>
	);
}
