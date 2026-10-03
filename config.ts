export interface SocialLink {
	platform: string;
	url: string;
}

export interface Project {
	title: string;
	description: string;
	tags: string[];
	year: string;
	status?: string;
	detail?: string;
	github?: string;
	demo?: string;
	development?: string;
}

export interface SiteConfig {
	site: {
		title: string;
		description: string;
		url: string;
	};
	profile: {
		name: string;
		role: string;
		roles: string[];
		location: string;
		pronouns: string;
		age: string;
		status: string;
		bio: string;
		socialsTitle: string;
		socialLinks: SocialLink[];
	};
	about: {
		sectionTag: string;
		title: string;
		lead: string;
		paragraphs: string[];
		stats: Array<{ label: string; value: string }>;
	};
	projects: {
		sectionTag: string;
		title: string;
		subtitle: string;
		list: Project[];
	};
	contact: {
		sectionTag: string;
		title: string;
		subtitle: string;
		website: string;
		discord: string;
		discordTitle: string;
		discordDesc: string;
		discordMembers: string;
		discordCta: string;
	};
	footer: {
		logoText: string;
		copyrightName: string;
		rightsText: string;
	};
}

const config = {
	site: {
		title: "Snibbi - Software Developer",
		description:
			"Backend focused software developer building reliable tools, systems, and communities.",
		url: "https://lilsnibbi.dev",
	},
	profile: {
		name: "Snibbi",
		role: "Hobby Software Developer",
		roles: [
			"Backend engineer",
			"TypeScript developer",
			"Open source contributor",
			"Official goofball",
			"World's worst cook",
		],
		location: "Australia",
		pronouns: "He/Him",
		age: "20",
		status: "Available for new projects",
		bio: "I build dependable software, useful developer tools, and the occasional questionable side project.",
		socialsTitle: "Find me online",
		socialLinks: [
			{ platform: "GitHub", url: "https://github.com/lilsnibbi" },
			{ platform: "Discord", url: "https://discord.gg/snibbi" },
		],
	},
	about: {
		sectionTag: "About",
		title: "A little about me.",
		lead: "I like making complicated things feel simple.",
		paragraphs: [
			"I'm a software engineer who enjoys untangling complex problems and building things that make life easier. Most of my work lives in backend infrastructure and developer tooling, where reliability matters more than chasing every new trend.",
			"Away from the editor, I'm usually gaming or running a Discord community of more than 1,500 people. Whether it's software or community work, the goal is the same: bring people together and keep improving the experience.",
		],
		stats: [
			{ label: "Languages", value: "JavaScript / TypeScript" },
			{ label: "Experience", value: "~6 years" },
			{ label: "Core stack", value: "Bun / Docker / PostgreSQL" },
		],
	},
	projects: {
		sectionTag: "Work",
		title: "Selected projects.",
		subtitle:
			"A small selection of tools, experiments, and community projects.",
		list: [
			{
				title: "bamu",
				description:
					"The custom Discord bot behind my community, built for moderation, automation, and a bit of personality.",
				detail:
					"A modular TypeScript/Bun codebase brings together moderation, support tickets, and community automation.",
				tags: ["TypeScript", "Bun", "Closed source"],
				year: "2026",
				status: "Community bot",
				demo: "https://snibbi.cc",
			},
			{
				title: "Keyzori",
				description:
					"Open-source, self-hosted license management for software products. I'm rebuilding v2, which is still in development.",
				detail:
					"The v2 HTTP API combines expiry, usage meters, and device/IP limits, backed by PostgreSQL and Redis.",
				tags: ["TypeScript", "Bun", "Open source"],
				year: "2026",
				status: "v2 in development",
				github: "https://github.com/keyzori/Keyzori",
				development: "https://github.com/keyzori/Keyzori/tree/v2",
			},
		],
	},
	contact: {
		sectionTag: "Contact",
		title: "Let's talk.",
		subtitle:
			"Have a project in mind, a question, or something you're building? I'd love to hear about it.",
		website: "https://snibbi.cc",
		discord: "lilsnibbi",
		discordTitle: "A place to hang out.",
		discordDesc:
			"A friendly server for gaming, building, and hanging out. We're waiting to meet you!",
		discordMembers: "1,500+ members",
		discordCta: "Join the server",
	},
	footer: {
		logoText: "Snibbi",
		copyrightName: "LilSnibbi",
		rightsText: "All rights reserved.",
	},
} satisfies SiteConfig;

export default config;
