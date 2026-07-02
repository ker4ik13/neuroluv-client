import type { FooterData, FooterLink } from "@/entities/footer";
import type {
  NavigationIcon,
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

type DirectusFile = {
  id: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
};

type DirectusNavigationItem = {
  id: number;
  sort: number | null;
  label: string | null;
  url: string | null;
  page_slug: string | null;
  anchor: string | null;
  target: "_self" | "_blank" | null;
  is_active: boolean | null;
};

type DirectusFooterMenu = {
  id: number;
  is_active: boolean | null;
  items?: DirectusNavigationItem[];
};

type DirectusSiteSettingsFooter = {
  site_name: string | null;
  short_name: string | null;
  site_description: string | null;
  copyright_text: string | null;
  developer_label: string | null;
  developer_url: string | null;
  logo: DirectusFile | string | null;
  footer_navigation: DirectusFooterMenu | null;
};

type DirectusSocialLink = {
  id: number;
  title: string | null;
  platform: string | null;
  url: string | null;
  icon: DirectusIcon | null;
};

type DirectusService = {
  id: number;
  sort: number | null;
  title: string | null;
  slug: string | null;
  card_title: string | null;
  status: "published" | "draft" | "archived" | string | null;
};

type DirectusPromptType = {
  id: number;
  sort: number | null;
  title: string | null;
  slug: string | null;
  is_active: boolean | null;
};

const FOOTER_SETTINGS_FIELDS = [
  "site_name",
  "short_name",
  "site_description",
  "copyright_text",
  "developer_label",
  "developer_url",
  "logo.id",
  "logo.title",
  "logo.type",
  "logo.width",
  "logo.height",
  "footer_navigation.id",
  "footer_navigation.is_active",
  "footer_navigation.items.id",
  "footer_navigation.items.sort",
  "footer_navigation.items.label",
  "footer_navigation.items.url",
  "footer_navigation.items.page_slug",
  "footer_navigation.items.anchor",
  "footer_navigation.items.target",
  "footer_navigation.items.is_active",
].join(",");

const SOCIAL_FIELDS = [
  "id",
  "title",
  "platform",
  "url",
  "icon.title",
  "icon.code",
  "icon.library",
  "icon.is_active",
].join(",");

const SERVICES_FIELDS = ["id", "sort", "title", "slug", "card_title", "status"].join(
  ",",
);

const PROMPT_TYPES_FIELDS = ["id", "sort", "title", "slug", "is_active"].join(",");

const FALLBACK_USEFUL_LINKS: FooterLink[] = [
  {
    id: "useful-ai-guides",
    label: "Гайды по ИИ",
    href: "/articles",
    target: "_self",
  },
  {
    id: "useful-ai-content",
    label: "Нейросети для контента",
    href: "/articles",
    target: "_self",
  },
  {
    id: "useful-ai-business",
    label: "AI для бизнеса",
    href: "/services",
    target: "_self",
  },
  {
    id: "useful-cases",
    label: "Кейсы и разборы",
    href: "/gallery",
    target: "_self",
  },
  {
    id: "useful-contact",
    label: "Связаться с нами",
    href: "https://t.me/neuroluv",
    target: "_blank",
  },
];

const LEGAL_LINKS: FooterLink[] = [
  {
    id: "privacy",
    label: "Политика конфиденциальности",
    href: "/privacy",
    target: "_self",
  },
  {
    id: "contacts",
    label: "Контакты",
    href: "/contacts",
    target: "_self",
  },
];

export async function getFooterData(): Promise<FooterData> {
  const [settings, socialLinks, services, promptTypes] = await Promise.all([
    directusRequest<DirectusSiteSettingsFooter>(
      `/items/site_settings?fields=${FOOTER_SETTINGS_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusSocialLink[]>(
      `/items/social_links?filter[is_active][_eq]=true&filter[show_in_footer][_eq]=true&sort=sort&fields=${SOCIAL_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusService[]>(
      `/items/services?filter[status][_eq]=published&sort=sort&limit=5&fields=${SERVICES_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusPromptType[]>(
      `/items/prompt_types?filter[is_active][_eq]=true&sort=sort&limit=5&fields=${PROMPT_TYPES_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
  ]);

  const siteName = settings.short_name || settings.site_name || "Нейролюб";

  return {
    siteName,
    description: settings.site_description || "",
    logo: normalizeLogo(settings.logo),
    socialLinks: socialLinks.map(normalizeSocialLink).filter(isSocialLink),
    columns: [
      {
        id: "sections",
        title: "Разделы",
        links: normalizeFooterNavigation(settings.footer_navigation?.items || []),
      },
      {
        id: "prompts",
        title: "Промпты",
        links: normalizePromptTypeLinks(promptTypes),
      },
      {
        id: "services",
        title: "Услуги",
        links: normalizeServiceLinks(services),
      },
      {
        id: "useful",
        title: "Полезное",
        links: FALLBACK_USEFUL_LINKS,
      },
    ].filter((column) => column.links.length > 0),
    copyrightText:
      settings.copyright_text || `© ${new Date().getFullYear()} ${siteName}. Все права защищены`,
    developerLabel: settings.developer_label,
    developerUrl: settings.developer_url,
    legalLinks: LEGAL_LINKS,
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

function normalizeFooterNavigation(items: DirectusNavigationItem[]): FooterLink[] {
  return items
    .filter((item) => item.is_active !== false && item.label)
    .sort(sortByDirectusSort)
    .map((item) => ({
      id: `section-${item.id}`,
      label: item.label || "",
      href: buildItemHref(item),
      target: item.target || "_self",
    }));
}

function normalizePromptTypeLinks(types: DirectusPromptType[]): FooterLink[] {
  return types
    .filter((type) => type.is_active !== false && type.title && type.slug)
    .sort(sortByDirectusSort)
    .map((type) => ({
      id: `prompt-type-${type.id}`,
      label: type.title || "",
      href: `/prompts?type=${type.slug}`,
      target: "_self" as const,
    }));
}

function normalizeServiceLinks(services: DirectusService[]): FooterLink[] {
  return services
    .filter((service) => service.status === "published" && service.slug)
    .sort(sortByDirectusSort)
    .map((service) => ({
      id: `service-${service.id}`,
      label: service.card_title || service.title || "",
      href: `/services/${service.slug}`,
      target: "_self" as const,
    }))
    .filter((link) => link.label);
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
  first: { sort: number | null },
  second: { sort: number | null },
): number {
  return (first.sort || 0) - (second.sort || 0);
}
