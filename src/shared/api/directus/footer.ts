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

type DirectusSiteSettingsFooter = {
  site_name: string | null;
  short_name: string | null;
  site_description: string | null;
  copyright_text: string | null;
  developer_label: string | null;
  developer_url: string | null;
  logo: DirectusFile | string | null;
};

type DirectusSocialLink = {
  id: number;
  title: string | null;
  platform: string | null;
  url: string | null;
  icon: DirectusIcon | null;
};

type DirectusFooterLink = {
  id: number;
  sort: number | null;
  label: string | null;
  url: string | null;
  target: "_self" | "_blank" | null;
  is_active: boolean | null;
  column: "sections" | "prompts" | "services" | "useful" | string | null;
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

const FOOTER_LINK_FIELDS = [
  "id",
  "sort",
  "label",
  "url",
  "target",
  "is_active",
  "column",
].join(",");

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
  const [settings, socialLinks, footerLinks] = await Promise.all([
    directusRequest<DirectusSiteSettingsFooter>(
      `/items/site_settings?fields=${FOOTER_SETTINGS_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusSocialLink[]>(
      `/items/social_links?filter[is_active][_eq]=true&filter[show_in_footer][_eq]=true&sort=sort&fields=${SOCIAL_FIELDS}`,
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusFooterLink[]>(
      `/items/footer_links?filter[is_active][_eq]=true&sort=sort&fields=${FOOTER_LINK_FIELDS}`,
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
        links: normalizeFooterLinks(footerLinks, "sections") || [],
      },
      {
        id: "prompts",
        title: "Промпты",
        links: normalizeFooterLinks(footerLinks, "prompts") || [],
      },
      {
        id: "services",
        title: "Услуги",
        links: normalizeFooterLinks(footerLinks, "services") || [],
      },
      {
        id: "useful",
        title: "Полезное",
        links: normalizeFooterLinks(footerLinks, "useful") || [],
      },
    ].filter((column) => column.links.length > 0),
    copyrightText:
      settings.copyright_text || `© ${new Date().getFullYear()} ${siteName}. Все права защищены`,
    developerLabel: settings.developer_label,
    developerUrl: settings.developer_url,
    legalLinks: LEGAL_LINKS,
  };
}

function normalizeFooterLinks(
  links: DirectusFooterLink[],
  column: DirectusFooterLink["column"],
): FooterLink[] | null {
  const normalizedLinks = links
    .filter((link) => link.is_active !== false)
    .filter((link) => link.column === column)
    .filter((link) => link.label && link.url)
    .sort(sortByDirectusSort)
    .map((link) => ({
      id: `footer-link-${link.id}`,
      label: link.label || "",
      href: link.url || "/",
      target: link.target || "_self",
    }));

  return normalizedLinks.length > 0 ? normalizedLinks : null;
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

function sortByDirectusSort(
  first: { sort: number | null },
  second: { sort: number | null },
): number {
  return (first.sort || 0) - (second.sort || 0);
}
