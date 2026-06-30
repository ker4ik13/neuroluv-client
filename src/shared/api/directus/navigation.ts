import type {
  HeaderNavigation,
  NavigationIcon,
  NavigationItem,
  NavigationLogo,
  SocialLink,
} from "@/entities/navigation";
import { directusRequest } from "@/shared/api/directus/client";
import { DIRECTUS_URL } from "@/shared/config/directus";

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
  target: "_self" | "_blank" | null;
  is_active: boolean | null;
  is_highlighted: boolean | null;
  icon: DirectusIcon | null;
  children?: DirectusNavigationItem[];
};

type DirectusHeaderMenu = {
  id: number;
  is_active: boolean | null;
  items?: DirectusNavigationItem[];
};

type DirectusSiteSettings = {
  site_name: string | null;
  short_name: string | null;
  logo: DirectusFile | string | null;
  header_navigation: DirectusHeaderMenu | null;
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
  "site_name",
  "short_name",
  "logo.id",
  "logo.title",
  "logo.type",
  "logo.width",
  "logo.height",
  "header_navigation.id",
  "header_navigation.is_active",
  "header_navigation.items.id",
  "header_navigation.items.sort",
  "header_navigation.items.label",
  "header_navigation.items.type",
  "header_navigation.items.url",
  "header_navigation.items.page_slug",
  "header_navigation.items.anchor",
  "header_navigation.items.target",
  "header_navigation.items.is_active",
  "header_navigation.items.is_highlighted",
  "header_navigation.items.icon.title",
  "header_navigation.items.icon.code",
  "header_navigation.items.icon.library",
  "header_navigation.items.icon.is_active",
  "header_navigation.items.children.id",
  "header_navigation.items.children.sort",
  "header_navigation.items.children.label",
  "header_navigation.items.children.type",
  "header_navigation.items.children.url",
  "header_navigation.items.children.page_slug",
  "header_navigation.items.children.anchor",
  "header_navigation.items.children.target",
  "header_navigation.items.children.is_active",
  "header_navigation.items.children.is_highlighted",
  "header_navigation.items.children.icon.title",
  "header_navigation.items.children.icon.code",
  "header_navigation.items.children.icon.library",
  "header_navigation.items.children.icon.is_active",
].join(",");

const HEADER_SOCIAL_FIELDS = [
  "id",
  "title",
  "platform",
  "url",
  "icon.title",
  "icon.code",
  "icon.library",
  "icon.is_active",
].join(",");

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
    siteName: settings.short_name || settings.site_name || "Нейролюб",
    logo: normalizeLogo(settings.logo),
    items: normalizeMenuItems(settings.header_navigation?.items || []),
    socialLinks: socialLinks.map(normalizeSocialLink).filter(isSocialLink),
  };
}

function normalizeLogo(logo: DirectusFile | string | null): NavigationLogo | null {
  if (!logo) {
    return null;
  }

  const file =
    typeof logo === "string"
      ? {
          id: logo,
          title: "Логотип",
          type: null,
          width: null,
          height: null,
        }
      : logo;

  return {
    id: file.id,
    title: file.title || "Логотип",
    url: `${DIRECTUS_URL}/assets/${file.id}`,
    type: file.type,
    width: file.width,
    height: file.height,
  };
}

function normalizeMenuItems(items: DirectusNavigationItem[]): NavigationItem[] {
  return items
    .filter((item) => item.is_active !== false && item.label)
    .sort(sortByDirectusSort)
    .map((item) => ({
      id: item.id,
      label: item.label || "",
      href: buildItemHref(item),
      target: item.target || "_self",
      icon: normalizeIcon(item.icon),
      isHighlighted: Boolean(item.is_highlighted),
      children: normalizeMenuItems(item.children || []),
    }));
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
    library: icon.library || "custom",
  };
}

function buildItemHref(item: DirectusNavigationItem): string {
  const baseHref = item.url || (item.page_slug ? `/${item.page_slug}` : "/");

  if (!item.anchor) {
    return baseHref;
  }

  const anchor = item.anchor.startsWith("#") ? item.anchor : `#${item.anchor}`;

  return baseHref === "/" ? anchor : `${baseHref}${anchor}`;
}

function sortByDirectusSort(
  first: DirectusNavigationItem,
  second: DirectusNavigationItem,
): number {
  return (first.sort || 0) - (second.sort || 0);
}
