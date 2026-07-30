import type {
	HeaderNavigation,
	NavigationIcon,
	NavigationItem,
	NavigationLogo,
	SocialLink,
} from '@/entities/navigation';
import { directusRequest } from '@/shared/api/directus/client';
import { DIRECTUS_URL } from '@/shared/config/directus';

type DirectusIcon = {
	title: string | null;
	code: string | null;
	library: string | null;
	is_active: boolean | null;
};

type DirectusNavigationItem = {
	id: number;
	sort: number | null;
	label: string | null;
	type: string | null;
	url: string | null;
	page_slug: string | null;
	anchor: string | null;
	target: '_self' | '_blank' | null;
	is_active: boolean | null;
	is_highlighted: boolean | null;
	badge_text: string | null;
	icon: DirectusIcon | null;
	children?: DirectusNavigationItem[];
};

type DirectusMenuItem = {
	id: number;
	sort: number | null;
	navigation_items_id: DirectusNavigationItem | number | null;
};

type DirectusHeaderMenu = {
	id: number;
	is_active: boolean | null;
	menu_items?: DirectusMenuItem[];
};

type DirectusSiteSettings = {
	site_name: string | null;
	short_name: string | null;
	logo: DirectusFile | string | null;
	header_navigation: DirectusHeaderMenu | null;
	header_studio?: DirectusHeaderMenu | null;
};

type DirectusFile = {
	id: string;
	title: string | null;
	type: string | null;
	width: number | null;
	height: number | null;
};

type DirectusSocialLink = {
	id: number;
	title: string | null;
	platform: string | null;
	url: string | null;
	icon: DirectusIcon | null;
};

const HEADER_SETTINGS_FIELDS = [
	'site_name',
	'short_name',
	'logo.id',
	'logo.title',
	'logo.type',
	'logo.width',
	'logo.height',
	'header_navigation.id',
	'header_navigation.is_active',
	'header_navigation.menu_items.id',
	'header_navigation.menu_items.sort',
	'header_navigation.menu_items.navigation_items_id.id',
	'header_navigation.menu_items.navigation_items_id.sort',
	'header_navigation.menu_items.navigation_items_id.label',
	'header_navigation.menu_items.navigation_items_id.type',
	'header_navigation.menu_items.navigation_items_id.url',
	'header_navigation.menu_items.navigation_items_id.page_slug',
	'header_navigation.menu_items.navigation_items_id.anchor',
	'header_navigation.menu_items.navigation_items_id.target',
	'header_navigation.menu_items.navigation_items_id.is_active',
	'header_navigation.menu_items.navigation_items_id.is_highlighted',
	'header_navigation.menu_items.navigation_items_id.badge_text',
	'header_navigation.menu_items.navigation_items_id.icon.title',
	'header_navigation.menu_items.navigation_items_id.icon.code',
	'header_navigation.menu_items.navigation_items_id.icon.library',
	'header_navigation.menu_items.navigation_items_id.icon.is_active',
	'header_navigation.menu_items.navigation_items_id.children.id',
	'header_navigation.menu_items.navigation_items_id.children.sort',
	'header_navigation.menu_items.navigation_items_id.children.label',
	'header_navigation.menu_items.navigation_items_id.children.type',
	'header_navigation.menu_items.navigation_items_id.children.url',
	'header_navigation.menu_items.navigation_items_id.children.page_slug',
	'header_navigation.menu_items.navigation_items_id.children.anchor',
	'header_navigation.menu_items.navigation_items_id.children.target',
	'header_navigation.menu_items.navigation_items_id.children.is_active',
	'header_navigation.menu_items.navigation_items_id.children.is_highlighted',
	'header_navigation.menu_items.navigation_items_id.children.badge_text',
	'header_navigation.menu_items.navigation_items_id.children.icon.title',
	'header_navigation.menu_items.navigation_items_id.children.icon.code',
	'header_navigation.menu_items.navigation_items_id.children.icon.library',
	'header_navigation.menu_items.navigation_items_id.children.icon.is_active',
].join(',');

const HEADER_SOCIAL_FIELDS = [
	'id',
	'title',
	'platform',
	'url',
	'icon.title',
	'icon.code',
	'icon.library',
	'icon.is_active',
].join(',');

const STUDIO_SETTINGS_FIELDS = [
	'site_name',
	'short_name',
	'logo.id',
	'logo.title',
	'logo.type',
	'logo.width',
	'logo.height',
	'header_studio.id',
	'header_studio.is_active',
	'header_studio.menu_items.id',
	'header_studio.menu_items.sort',
	'header_studio.menu_items.navigation_items_id.id',
	'header_studio.menu_items.navigation_items_id.sort',
	'header_studio.menu_items.navigation_items_id.label',
	'header_studio.menu_items.navigation_items_id.type',
	'header_studio.menu_items.navigation_items_id.url',
	'header_studio.menu_items.navigation_items_id.page_slug',
	'header_studio.menu_items.navigation_items_id.anchor',
	'header_studio.menu_items.navigation_items_id.target',
	'header_studio.menu_items.navigation_items_id.is_active',
	'header_studio.menu_items.navigation_items_id.is_highlighted',
	'header_studio.menu_items.navigation_items_id.badge_text',
	'header_studio.menu_items.navigation_items_id.icon.title',
	'header_studio.menu_items.navigation_items_id.icon.code',
	'header_studio.menu_items.navigation_items_id.icon.library',
	'header_studio.menu_items.navigation_items_id.icon.is_active',
	'header_studio.menu_items.navigation_items_id.children.id',
	'header_studio.menu_items.navigation_items_id.children.sort',
	'header_studio.menu_items.navigation_items_id.children.label',
	'header_studio.menu_items.navigation_items_id.children.type',
	'header_studio.menu_items.navigation_items_id.children.url',
	'header_studio.menu_items.navigation_items_id.children.page_slug',
	'header_studio.menu_items.navigation_items_id.children.anchor',
	'header_studio.menu_items.navigation_items_id.children.target',
	'header_studio.menu_items.navigation_items_id.children.is_active',
	'header_studio.menu_items.navigation_items_id.children.is_highlighted',
	'header_studio.menu_items.navigation_items_id.children.badge_text',
	'header_studio.menu_items.navigation_items_id.children.icon.title',
	'header_studio.menu_items.navigation_items_id.children.icon.code',
	'header_studio.menu_items.navigation_items_id.children.icon.library',
	'header_studio.menu_items.navigation_items_id.children.icon.is_active',
].join(',');

const MENU_FIELDS = [
	'id',
	'is_active',
	'menu_items.id',
	'menu_items.sort',
	'menu_items.navigation_items_id.id',
	'menu_items.navigation_items_id.sort',
	'menu_items.navigation_items_id.label',
	'menu_items.navigation_items_id.type',
	'menu_items.navigation_items_id.url',
	'menu_items.navigation_items_id.page_slug',
	'menu_items.navigation_items_id.anchor',
	'menu_items.navigation_items_id.target',
	'menu_items.navigation_items_id.is_active',
	'menu_items.navigation_items_id.is_highlighted',
	'menu_items.navigation_items_id.badge_text',
	'menu_items.navigation_items_id.icon.title',
	'menu_items.navigation_items_id.icon.code',
	'menu_items.navigation_items_id.icon.library',
	'menu_items.navigation_items_id.icon.is_active',
	'menu_items.navigation_items_id.children.id',
	'menu_items.navigation_items_id.children.sort',
	'menu_items.navigation_items_id.children.label',
	'menu_items.navigation_items_id.children.type',
	'menu_items.navigation_items_id.children.url',
	'menu_items.navigation_items_id.children.page_slug',
	'menu_items.navigation_items_id.children.anchor',
	'menu_items.navigation_items_id.children.target',
	'menu_items.navigation_items_id.children.is_active',
	'menu_items.navigation_items_id.children.is_highlighted',
	'menu_items.navigation_items_id.children.badge_text',
	'menu_items.navigation_items_id.children.icon.title',
	'menu_items.navigation_items_id.children.icon.code',
	'menu_items.navigation_items_id.children.icon.library',
	'menu_items.navigation_items_id.children.icon.is_active',
].join(',');

export async function getHeaderNavigation(): Promise<HeaderNavigation> {
	const [settings, socialLinks] = await Promise.all([
		directusRequest<DirectusSiteSettings>(
			`/items/site_settings?fields=${HEADER_SETTINGS_FIELDS}`,
			{ next: { revalidate: 60 } },
		),
		directusRequest<DirectusSocialLink[]>(
			`/items/social_links?filter[is_active][_eq]=true&filter[show_in_header][_eq]=true&sort=sort&fields=${HEADER_SOCIAL_FIELDS}`,
			{ next: { revalidate: 60 } },
		),
	]);

	return {
		siteName: settings.short_name || settings.site_name || 'Нейролюб',
		logo: normalizeLogo(settings.logo),
		items: normalizeMenuItems(settings.header_navigation?.menu_items || []),
		socialLinks: socialLinks.map(normalizeSocialLink).filter(isSocialLink),
	};
}

export async function getStudioHeaderNavigation(): Promise<HeaderNavigation> {
	try {
		const settings = await directusRequest<DirectusSiteSettings>(
			`/items/site_settings?fields=${STUDIO_SETTINGS_FIELDS}`,
			{ next: { revalidate: 60 } },
		);
		const selectedMenu = settings.header_studio;
		const menu =
			selectedMenu === null || selectedMenu === undefined
				? await getNavigationMenuByCode('header_studio')
				: selectedMenu;

		return {
			siteName: settings.short_name || settings.site_name || 'Нейролюб',
			logo: normalizeLogo(settings.logo),
			items: normalizeActiveMenuItems(menu),
			socialLinks: [],
		};
	} catch {
		const [header, menu] = await Promise.all([
			getHeaderNavigation(),
			getNavigationMenuByCode('header_studio'),
		]);

		return {
			...header,
			items: normalizeActiveMenuItems(menu),
			socialLinks: [],
		};
	}
}

async function getNavigationMenuByCode(
	code: string,
): Promise<DirectusHeaderMenu | null> {
	const menus = await directusRequest<DirectusHeaderMenu[]>(
		`/items/navigation_menus?filter[code][_eq]=${encodeURIComponent(code)}&limit=1&fields=${MENU_FIELDS}`,
		{ next: { revalidate: 60 } },
	);

	return menus[0] || null;
}

function normalizeActiveMenuItems(
	menu: DirectusHeaderMenu | null,
): NavigationItem[] {
	if (!menu || menu.is_active === false) {
		return [];
	}

	return normalizeMenuItems(menu.menu_items || []);
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

function normalizeMenuItems(items: DirectusMenuItem[]): NavigationItem[] {
	return items
		.filter(hasPopulatedNavigationItem)
		.sort(sortByMenuItemSort)
		.map(({ navigation_items_id: item }) =>
			normalizeNavigationItem(item, normalizeChildItems(item.children || [])),
		);
}

function normalizeChildItems(
	items: DirectusNavigationItem[],
): NavigationItem[] {
	return items
		.filter(isVisibleNavigationItem)
		.sort(sortByDirectusSort)
		.map((item) => normalizeNavigationItem(item, []));
}

function normalizeNavigationItem(
	item: DirectusNavigationItem,
	children: NavigationItem[],
): NavigationItem {
	return {
		id: item.id,
		label: item.label || '',
		href: buildItemHref(item),
		target: item.target || '_self',
		icon: normalizeIcon(item.icon),
		badgeText: normalizeBadgeText(item.badge_text),
		isHighlighted: Boolean(item.is_highlighted),
		children,
	};
}

function hasPopulatedNavigationItem(
	menuItem: DirectusMenuItem,
): menuItem is DirectusMenuItem & {
	navigation_items_id: DirectusNavigationItem;
} {
	return (
		typeof menuItem.navigation_items_id === 'object' &&
		menuItem.navigation_items_id !== null &&
		isVisibleNavigationItem(menuItem.navigation_items_id)
	);
}

function isVisibleNavigationItem(
	item: DirectusNavigationItem,
): item is DirectusNavigationItem & { label: string } {
	return item.is_active !== false && Boolean(item.label);
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

function normalizeBadgeText(value: string | null): string | null {
	return value?.trim() || null;
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

function buildItemHref(item: DirectusNavigationItem): string {
	const baseHref = item.url || (item.page_slug ? `/${item.page_slug}` : '/');

	if (!item.anchor) {
		return baseHref;
	}

	const anchor = item.anchor.startsWith('#') ? item.anchor : `#${item.anchor}`;

	return baseHref === '/' ? anchor : `${baseHref}${anchor}`;
}

function sortByDirectusSort(
	first: DirectusNavigationItem,
	second: DirectusNavigationItem,
): number {
	return compareNullableSort(first.sort, second.sort) || first.id - second.id;
}

function sortByMenuItemSort(
	first: DirectusMenuItem,
	second: DirectusMenuItem,
): number {
	return (
		compareNullableSort(getMenuItemSort(first), getMenuItemSort(second)) ||
		first.id - second.id
	);
}

function getMenuItemSort(menuItem: DirectusMenuItem): number | null {
	const navigationItem = menuItem.navigation_items_id;
	const navigationItemSort =
		typeof navigationItem === 'object' && navigationItem !== null
			? navigationItem.sort
			: null;

	return menuItem.sort ?? navigationItemSort;
}

function compareNullableSort(
	first: number | null,
	second: number | null,
): number {
	return (
		(first ?? Number.MAX_SAFE_INTEGER) - (second ?? Number.MAX_SAFE_INTEGER)
	);
}
