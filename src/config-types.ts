export interface ImageSource {
	url: string;
	alt?: string;
}

export interface SocialLink {
	platform: string;
	url: string;
	icon: ImageSource;
}

export interface Project {
	slug: string;
	title: string;
	description: string;
	category: string;
	banner: ImageSource;
	isFront: boolean;
	tags: string[];
	year: string;
	status?: string;
	github?: string;
	demo?: string;
	development?: string;
}

export interface Tool {
	name: string;
	description?: string;
	icon: ImageSource;
}

export interface Specification {
	label: string;
	value: string;
}

export interface SiteConfig {
	site: {
		title: string;
		description: string;
		url: string;
		favicon: ImageSource;
	};
	profile: {
		name: string;
		avatar: ImageSource;
		role: string;
		location: string;
		timeZone: string;
		pronouns: string;
		age: string;
		bio: string;
		socials: {
			title: string;
			links: SocialLink[];
		};
	};
	about: {
		title: string;
		lead: string;
		paragraphs: string[];
		experience: string;
	};
	projects: {
		sectionTag: string;
		title: string;
		subtitle: string;
		list: Project[];
	};
	notes: {
		title: string;
		subtitle: string;
	};
	uses: {
		description: string;
		languages: Tool[];
		development: Tool[];
		infrastructure: Specification[];
		pc: Specification[];
		software: Tool[];
	};
	contact: {
		subtitle: string;
		website: string;
		discord: string;
		community: {
			title: string;
			description: string;
			members: string;
		};
	};
	footer: {
		copyrightName: string;
	};
}
