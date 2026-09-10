import type { FooterData, FooterLink } from '@/entities/footer';
import type {
	NavigationIcon,
	NavigationLogo,
	SocialLink,
} from '@/entities/navigation';
import { directusRequest } from '@/shared/api/directus/client';
import { AI_SUPPORT_URL } from '@/shared/config/ai';
import { DIRECTUS_URL } from '@/shared/config/directus';

type DirectusIcon = {
	title: string | null;
	code: string | null;
	library: string | null;
	is_active: boolean | null;
};

type DirectusFile = {
	id: string;
	title: string | null;
	type: string | null;
	width: number | null;
	height: number | null;
};

type DirectusSiteSettingsFooter = {
	site_name: string | null;
	short_name: string | null;
	site_description: string | null;
	copyright_text: string | null;
	developer_label: string | null;
	developer_url: string | null;
	logo: DirectusFile | string | null;
	footer_navigation?: DirectusFooterMenuAssignment[];
};

type DirectusSocialLink = {
	id: number;
	title: string | null;
	platform: string | null;
	url: string | null;
	icon: DirectusIcon | null;
};

type DirectusAiSettingsFooter = {
	support_telegram: string | null;
};

type DirectusNavigationItem = {
	id: number;
	sort: number | null;
	label: string | null;
	url: string | null;
	page_slug: string | null;
	anchor: string | null;
	target: '_self' | '_blank' | null;
	is_active: boolean | null;
};

type DirectusMenuItem = {
	id: number;
	sort: number | null;
	navigation_items_id: DirectusNavigationItem | number | null;
};

type DirectusFooterMenu = {
	id: number;
	sort: number | null;
	title: string | null;
	footer_name: string | null;
	is_active: boolean | null;
	menu_items?: DirectusMenuItem[];
};

type DirectusFooterMenuAssignment = {
	id: number;
	sort: number | null;
	navigation_menus_id: DirectusFooterMenu | number | null;
};

const FOOTER_SETTINGS_FIELDS = [
	'site_name',
	'short_name',
	'site_description',
	'copyright_text',
	'developer_label',
	'developer_url',
	'logo.id',
	'logo.title',
	'logo.type',
	'logo.width',
	'logo.height',
	'footer_navigation.id',
	'footer_navigation.sort',
	'footer_navigation.navigation_menus_id.id',
	'footer_navigation.navigation_menus_id.sort',
	'footer_navigation.navigation_menus_id.title',
	'footer_navigation.navigation_menus_id.footer_name',
	'footer_navigation.navigation_menus_id.is_active',
	'footer_navigation.navigation_menus_id.menu_items.id',
	'footer_navigation.navigation_menus_id.menu_items.sort',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.id',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.sort',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.label',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.url',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.page_slug',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.anchor',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.target',
	'footer_navigation.navigation_menus_id.menu_items.navigation_items_id.is_active',
].join(',');

const SOCIAL_FIELDS = [
	'id',
	'title',
	'platform',
	'url',
	'icon.title',
	'icon.code',
	'icon.library',
	'icon.is_active',
].join(',');

const LEGAL_LINKS: FooterLink[] = [
	{
		id: 'user-agreement',
		label: 'Пользовательское соглашение',
		href: '/legal/user-agreement',
		target: '_self',
	},
	{
		id: 'public-offer',
		label: 'Публичная оферта',
		href: '/legal/public-offer',
		target: '_self',
	},
	{
		id: 'personal-data-policy',
		label: 'Политика обработки персональных данных',
		href: '/legal/personal-data-policy',
		target: '_self',
	},
	{
		id: 'personal-data-consent',
		label: 'Согласие на обработку персональных данных',
		href: '/legal/personal-data-consent',
		target: '_self',
	},
	{
		id: 'marketing-consent',
		label: 'Согласие на рассылки',
		href: '/legal/marketing-consent',
		target: '_self',
	},
];

const CONTACT_LINK: FooterLink = {
	id: 'contacts',
	label: 'Контакты',
	href: '/contacts',
	target: '_self',
};

export async function getFooterData(): Promise<FooterData> {
	const [settings, socialLinks, aiSettings] = await Promise.all([
		directusRequest<DirectusSiteSettingsFooter>(
			'/items/site_settings?fields=' + FOOTER_SETTINGS_FIELDS,
			{ next: { revalidate: 60 } },
		),
		directusRequest<DirectusSocialLink[]>(
			'/items/social_links?filter[is_active][_eq]=true&filter[show_in_footer][_eq]=true&sort=sort&fields=' +
				SOCIAL_FIELDS,
			{ next: { revalidate: 60 } },
		),
		directusRequest<DirectusAiSettingsFooter>(
			'/items/ai_settings?fields=support_telegram',
			{ next: { revalidate: 60 } },
		),
	]);

	const siteName = settings.short_name || settings.site_name || 'Нейролюб';

	return {
		siteName,
		description: settings.site_description || '',
		logo: normalizeLogo(settings.logo),
		socialLinks: socialLinks.map(normalizeSocialLink).filter(isSocialLink),
		columns: normalizeFooterColumns(settings.footer_navigation || []),
		copyrightText:
			settings.copyright_text ||
			'© ' + new Date().getFullYear() + ' ' + siteName + '. Все права защищены',
		developerLabel: settings.developer_label,
		developerUrl: settings.developer_url,
		legalLinks: withSupportLink(
			LEGAL_LINKS,
			normalizeSupportHref(aiSettings.support_telegram) || AI_SUPPORT_URL,
		),
		contactLink: CONTACT_LINK,
	};
}

function withSupportLink(links: FooterLink[], href: string): FooterLink[] {
	return [
		...links,
		{
			id: 'support',
			label: 'Поддержка',
			href,
			target: '_blank',
		},
	];
}

function normalizeSupportHref(value: string | null): string | null {
	if (!value || value.length > 2_048) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url.toString() : null;
	} catch {
		return null;
	}
}

function normalizeFooterColumns(assignments: DirectusFooterMenuAssignment[]) {
	return assignments
		.filter(hasPopulatedFooterMenu)
		.filter(({ navigation_menus_id: menu }) => menu.is_active !== false)
		.sort(sortByDirectusSort)
		.map(({ navigation_menus_id: menu }) => ({
			id: 'footer-menu-' + menu.id,
			title: menu.footer_name || menu.title || '',
			links: normalizeMenuLinks(menu.menu_items || []),
		}))
		.filter((column) => Boolean(column.title) && column.links.length > 0);
}

function normalizeMenuLinks(items: DirectusMenuItem[]): FooterLink[] {
	return items
		.filter(hasPopulatedNavigationItem)
		.filter(({ navigation_items_id: item }) => item.is_active !== false)
		.sort(sortByDirectusSort)
		.map(({ navigation_items_id: item }) => ({
			id: 'footer-menu-item-' + item.id,
			label: item.label || '',
			href: buildItemHref(item),
			target: item.target || '_self',
		}))
		.filter((link) => Boolean(link.label) && Boolean(link.href));
}

function hasPopulatedFooterMenu(
	assignment: DirectusFooterMenuAssignment,
): assignment is DirectusFooterMenuAssignment & {
	navigation_menus_id: DirectusFooterMenu;
} {
	return (
		typeof assignment.navigation_menus_id === 'object' &&
		assignment.navigation_menus_id !== null
	);
}

function hasPopulatedNavigationItem(
	item: DirectusMenuItem,
): item is DirectusMenuItem & {
	navigation_items_id: DirectusNavigationItem;
} {
	return (
		typeof item.navigation_items_id === 'object' &&
		item.navigation_items_id !== null
	);
}

function buildItemHref(item: DirectusNavigationItem): string {
	const baseHref = item.url || (item.page_slug ? '/' + item.page_slug : '/');

	if (!item.anchor) {
		return baseHref;
	}

	const anchor = item.anchor.startsWith('#') ? item.anchor : '#' + item.anchor;
	return baseHref === '/' ? anchor : baseHref + anchor;
}

function normalizeLogo(
	logo: DirectusFile | string | null,
): NavigationLogo | null {
	if (!logo) {
		return null;
	}

	const file =
		typeof logo === 'string'
			? {
					id: logo,
					title: 'Логотип',
					type: null,
					width: null,
					height: null,
				}
			: logo;

	return {
		id: file.id,
		title: file.title || 'Логотип',
		url: `${DIRECTUS_URL}/assets/${file.id}`,
		type: file.type,
		width: file.width,
		height: file.height,
	};
}

function normalizeSocialLink(link: DirectusSocialLink): SocialLink | null {
	if (!link.title || !link.platform || !link.url) {
		return null;
	}

	return {
		id: link.id,
		title: link.title,
		platform: link.platform,
		url: link.url,
		icon: normalizeIcon(link.icon),
	};
}

function isSocialLink(link: SocialLink | null): link is SocialLink {
	return link !== null;
}

function normalizeIcon(icon: DirectusIcon | null): NavigationIcon | null {
	if (!icon?.code || icon.is_active === false) {
		return null;
	}

	return {
		title: icon.title || icon.code,
		code: icon.code,
		library: icon.library || 'custom',
	};
}

function sortByDirectusSort(
	first: { id: number; sort: number | null },
	second: { id: number; sort: number | null },
): number {
	return (
		(first.sort ?? Number.MAX_SAFE_INTEGER) -
			(second.sort ?? Number.MAX_SAFE_INTEGER) || first.id - second.id
	);
}
