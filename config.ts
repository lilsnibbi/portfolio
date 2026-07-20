export interface SocialLink {
	platform: string;
	url: string;
}

export interface Project {
	title: string;
	description: string;
	tags: string[];
	year: string;
	github?: string;
	demo?: string;
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
		email: string;
		discord: string;
		discordTitle: string;
		discordDesc: string;
	};
	footer: {
		logoText: string;
		copyrightName: string;
		rightsText: string;
	};
}

const config = {
	site: {
		title: "Snibbi — Software Developer",
		description:
			"Backend focused software developer building reliable tools, systems, and communities.",
		url: "https://lilsnibbi.dev",
	},
	profile: {
		name: "Snibbi",
		role: "Hobby Software Developer",
		roles: [
			"Backend Engineer",
			"TypeScript Developer",
			"Open Source Contributor",
			"Official Goofball",
			"World's Worst Cook",
		],
		location: "Australia",
		pronouns: "He/Him",
		age: "20",
		status: "Available for new projects",
		bio: "I build dependable software, useful developer tools, and the occasional questionable side project.",
		socialsTitle: "Find me online",
		socialLinks: [
			{ platform: "GitHub", url: "https://github.com/lilsnibbi" },
			{ platform: "Discord", url: "https://discord.gg/tsukiyo" },
		],
	},
	about: {
		sectionTag: "About",
		title: "Clean systems. Human outcomes.",
		lead: "I care about the invisible details that make software feel effortless.",
		paragraphs: [
			"I'm a software engineer who enjoys untangling complex problems and building things that make life easier. Most of my work lives in backend infrastructure and developer tooling, where reliability matters more than chasing every new trend.",
			"Away from the editor, I'm usually gaming or running a Discord community of more than 1,500 people. Whether it's software or community work, the goal is the same: bring people together and keep improving the experience.",
		],
		stats: [
			{ label: "Languages", value: "TypeScript / JavaScript / SQL" },
			{ label: "Experience", value: "~6 years" },
			{ label: "Core stack", value: "Bun / Docker / Ubuntu" },
		],
	},
	projects: {
		sectionTag: "Selected work",
		title: "Things I've shipped.",
		subtitle:
			"A small selection of tools, experiments, and community projects.",
		list: [
			{
				title: "Lumi",
				description:
					"The custom Discord bot behind my community, built for moderation, automation, and a bit of personality.",
				tags: ["TypeScript", "Bun", "Closed source"],
				year: "2026",
				demo: "https://tsukiyo.cc",
			},
			{
				title: "Keyzori",
				description:
					"Self-hosted license management for software products. Built in SDK, FOSS and self hostable!",
				tags: ["TypeScript", "Bun", "Open Source"],
				year: "2026",
				github: "https://github.com/lilsnibbi/Keyzori",
			},
			{
				title: "CLI Password Manager",
				description:
					"A focused, minimal command-line password manager designed around security and a fast workflow.",
				tags: ["CLI", "Bun", "Open source"],
				year: "2026",
				github: "https://github.com/lilsnibbi/CLI-Password-Manager",
			},
		],
	},
	contact: {
		sectionTag: "Contact",
		title: "Let's make something good.",
		subtitle:
			"Have an idea, a tricky problem, or just want to say hello? My inbox and community are open.",
		email: "me@lilsnibbi.dev",
		discord: "lilsnibbi",
		discordTitle: "Join the family!",
		discordDesc: "We're waiting to meet you!",
	},
	footer: {
		logoText: "Snibbi",
		copyrightName: "LilSnibbi",
		rightsText: "All rights reserved.",
	},
} satisfies SiteConfig;

export default config;
