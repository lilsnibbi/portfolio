import type { SiteConfig } from "./src/config-types";

export type {
	ImageSource,
	Project,
	SiteConfig,
	SocialLink,
	Specification,
	Tool,
} from "./src/config-types";

const config = {
	site: {
		title: "Snibbi - Software Developer",
		description:
			"Backend focused software developer building reliable tools, systems, and communities.",
		url: "https://lilsnibbi.dev",
		favicon: { url: "/favicon.ico" },
		socialImage: {
			url: "/public/img/opengraph.png",
			alt: "Snibbi — Making life easier, one line of code at a time",
			width: 1200,
			height: 320,
			type: "image/png",
		},
	},
	profile: {
		name: "Snibbi",
		avatar: { url: "https://github.com/lilsnibbi.png?size=256" },
		role: "Hobby Software Developer",
		location: "Australia",
		timeZone: "Australia/Sydney",
		pronouns: "He/Him",
		age: "20",
		bio: "I build dependable software, useful developer tools, and the occasional questionable side project.",
		socials: {
			title: "Find me online",
			links: [
				{
					platform: "GitHub",
					url: "https://github.com/lilsnibbi",
					icon: { url: "" },
				},
				{
					platform: "Discord",
					url: "https://discord.gg/snibbi",
					icon: { url: "" },
				},
			],
		},
	},
	about: {
		title: "A little about me.",
		lead: "I like making complicated things feel simple.",
		paragraphs: [
			"I'm a software engineer who enjoys untangling complex problems and building things that make life easier. Most of my work lives in backend infrastructure and developer tooling, where reliability matters more than chasing every new trend.",
			"Away from the editor, I'm usually gaming or running a Discord community of more than 2000 people. Whether it's software or community work, the goal is the same: bring people together and keep improving the experience.",
		],
		experience: "~6 years",
	},
	projects: {
		sectionTag: "Work",
		title: "Selected projects.",
		subtitle:
			"A small selection of tools, experiments, and community projects.",
		list: [
			{
				slug: "bamu",
				title: "bamu",
				description:
					"The custom Discord bot behind my community, built for moderation, automation, and a bit of personality.",
				category: "Community tooling",
				banner: {
					url: "/public/img/projects/bamu.svg",
					alt: "A monochrome illustration of bamu connecting moderation, support tickets, and community automation.",
				},
				isFront: true,
				tags: ["TypeScript", "Bun", "Closed source"],
				year: "2026",
				status: "Community bot",
				demo: "https://snibbi.cc",
			},
			{
				slug: "keyzori",
				title: "Keyzori",
				description:
					"Open-source, self-hosted license management for software products. I'm rebuilding v2, which is still in development.",
				category: "Developer tools",
				banner: {
					url: "/public/img/projects/keyzori.svg",
					alt: "A monochrome architecture illustration connecting the Keyzori API to PostgreSQL and Redis.",
				},
				isFront: true,
				tags: ["TypeScript", "Bun", "Open source"],
				year: "2026",
				status: "v2 in development",
				github: "https://github.com/keyzori/Keyzori",
				development: "https://github.com/keyzori/Keyzori/tree/v2",
			},
		],
	},
	notes: {
		title: "Notes from the workbench.",
		subtitle:
			"A place for development notes, small discoveries, and a closer look at the things I'm building.",
	},
	uses: {
		description:
			"The languages, tools, and setup behind the things I build. A little look at my everyday workbench.",
		languages: [
			{
				name: "JavaScript",
				description: "One of the languages I build with.",
				icon: { url: "" },
			},
			{
				name: "TypeScript",
				description: "My go-to for backend systems and developer tools.",
				icon: { url: "" },
			},
		],
		development: [
			{
				name: "Bun",
				description: "A runtime and toolkit for JavaScript and TypeScript.",
				icon: { url: "" },
			},
			{
				name: "Docker",
				description: "Containers for applications and services.",
				icon: { url: "" },
			},
			{
				name: "PostgreSQL",
				description: "Relational data storage for the things I build.",
				icon: { url: "" },
			},
		],
		// Add entries such as { label: "Host", value: "Your hardware or provider" }.
		infrastructure: [],
		// Add CPU, GPU, RAM, storage, displays, and peripherals here.
		pc: [],
		software: [
			{
				name: "GitHub",
				description: "Projects, source code, and open-source work.",
				icon: { url: "" },
			},
			{
				name: "Discord",
				description: "Community, conversations, and keeping in touch.",
				icon: { url: "" },
			},
		],
	},
	contact: {
		subtitle:
			"Have a project in mind, a question, or something you're building? I'd love to hear about it.",
		website: "https://snibbi.cc",
		discord: "lilsnibbi",
		community: {
			title: "A place to hang out.",
			description:
				"A friendly server for gaming, building, and hanging out. We're waiting to meet you!",
			members: "2000+ members",
		},
	},
	footer: {
		copyrightName: "LilSnibbi",
	},
} satisfies SiteConfig;

export default config;
