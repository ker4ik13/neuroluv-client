export type NavigationIcon = {
	title: string;
	code: string;
	library: string;
};

export type NavigationItem = {
	id: number;
	label: string;
	href: string;
	target: '_self' | '_blank';
	icon: NavigationIcon | null;
	badgeText?: string | null;
	isHighlighted: boolean;
	children: NavigationItem[];
};

export type SocialLink = {
	id: number;
	title: string;
	platform: string;
	url: string;
	icon: NavigationIcon | null;
};

export type NavigationLogo = {
	id: string;
	title: string;
	url: string;
	type: string | null;
	width: number | null;
	height: number | null;
};

export type HeaderNavigation = {
	siteName: string;
	logo: NavigationLogo | null;
	items: NavigationItem[];
	socialLinks: SocialLink[];
};
