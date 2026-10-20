export type NoticeButton = {
	id: string;
	label: string;
	action: 'link' | 'modal' | 'close';
	href: string;
	modal: string;
	variant: 'primary' | 'secondary' | 'ghost';
	newTab: boolean;
};

export type SiteNotice = {
	id: string;
	key: string;
	kind: 'modal' | 'floating';
	title: string;
	text: string;
	badge: string;
	benefits: string[];
	footnote: string;
	image: {
		url: string;
		alt: string;
		width: number | null;
		height: number | null;
	} | null;
	buttons: NoticeButton[];
	trigger: 'manual' | 'delay' | 'scroll' | 'either' | 'both';
	delaySeconds: number;
	scrollDesktop: number;
	scrollMobile: number;
	includePaths: string[];
	excludePaths: string[];
	allowWorkspace: boolean;
	priority: number;
	frequency: 'version' | 'session' | 'days';
	repeatDays: number;
	version: string;
	startsAt: string | null;
	endsAt: string | null;
};

export type CookieSettings = {
	enabled: boolean;
	title: string;
	text: string;
	policyUrl: string;
	policyLabel: string;
	acceptLabel: string;
	version: string;
};

export type SiteNoticesConfig = {
	notices: SiteNotice[];
	cookies: CookieSettings;
};
export type NoticeHistory = Record<
	string,
	{ revision: string; at: number; session: string }
>;
export type CookieAcknowledgement = { revision: string; at: number };

export const DEFAULT_COOKIE_SETTINGS: CookieSettings = {
	enabled: true,
	title: 'Немного о cookies',
	text: 'Мы используем cookies для работы сайта, сохранения настроек и аналитики посещений. Подробнее об обработке данных — в нашей политике.',
	policyUrl: '/legal/personal-data-policy',
	policyLabel: 'Подробнее о данных',
	acceptLabel: 'Понятно',
	version: '1',
};
