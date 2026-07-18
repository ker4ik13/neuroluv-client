import type { PageSeo, SeoAsset, SiteSeo } from "@/entities/seo";
import { directusRequest } from "@/shared/api/directus/client";
import { buildDirectusAssetUrl } from "@/shared/config/directus";
import { getDirectusPreviewContext } from "@/shared/lib/preview/directus-preview";

type DirectusFile = {
  id: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
};

type DirectusSiteSettingsSeo = {
  site_name: string | null;
  short_name: string | null;
  site_description: string | null;
  default_meta_title: string | null;
  default_meta_description: string | null;
  logo: DirectusFile | string | null;
  favicon: DirectusFile | string | null;
  default_og_image: DirectusFile | string | null;
};

type DirectusPageSeo = {
  title: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_noindex: boolean | null;
  seo_nofollow: boolean | null;
  canonical_url: string | null;
  og_image: DirectusFile | string | null;
};

const SITE_SEO_FIELDS = [
  "site_name",
  "short_name",
  "site_description",
  "default_meta_title",
  "default_meta_description",
  "logo.id",
  "logo.title",
  "logo.type",
  "logo.width",
  "logo.height",
  "favicon.id",
  "favicon.title",
  "favicon.type",
  "favicon.width",
  "favicon.height",
  "default_og_image.id",
  "default_og_image.title",
  "default_og_image.type",
  "default_og_image.width",
  "default_og_image.height",
].join(",");

const FALLBACK_SITE_SEO: SiteSeo = {
  siteName: "Нейролюб",
  shortName: "Нейролюб",
  siteDescription: "",
  defaultMetaTitle: "Нейролюб",
  defaultMetaDescription: "",
  logo: null,
  favicon: null,
  defaultOgImage: null,
};

export type DirectusSeoFields = DirectusPageSeo;

export const DIRECTUS_SEO_FIELDS = [
  "title",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_noindex",
  "seo_nofollow",
  "canonical_url",
  "og_image.id",
  "og_image.title",
  "og_image.type",
  "og_image.width",
  "og_image.height",
].join(",");

export async function getSiteSeo(): Promise<SiteSeo> {
  let settings: DirectusSiteSettingsSeo;

  try {
    settings = await directusRequest<DirectusSiteSettingsSeo>(
      `/items/site_settings?fields=${SITE_SEO_FIELDS}`,
      { next: { revalidate: 60 } },
    );
  } catch {
    return FALLBACK_SITE_SEO;
  }

  const siteName = settings.site_name || "Нейролюб";
  const siteDescription = settings.site_description || "";
  const defaultMetaDescription =
    settings.default_meta_description || siteDescription;

  return {
    siteName,
    shortName: settings.short_name || siteName,
    siteDescription,
    defaultMetaTitle: settings.default_meta_title || siteName,
    defaultMetaDescription,
    logo: normalizeAsset(settings.logo, "Логотип"),
    favicon: normalizeAsset(settings.favicon, "Фавикон"),
    defaultOgImage: normalizeAsset(settings.default_og_image, "Open Graph"),
  };
}

export async function getPageSeoBySlug(slug: string): Promise<PageSeo | null> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: DIRECTUS_SEO_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    params.set("filter[status][_eq]", "published");
  }

  params.set("filter[slug][_eq]", slug);

  let pages: DirectusPageSeo[];

  try {
    pages = await directusRequest<DirectusPageSeo[]>(
      `/items/pages?${params.toString()}`,
      preview.requestOptions,
    );
  } catch {
    return null;
  }

  const page = pages[0];

  if (!page) {
    return null;
  }

  return normalizeDirectusSeo(page);
}

export async function getPageSeoByPath(path: string): Promise<PageSeo | null> {
  return getPageSeoBySlug(path);
}

export function normalizeDirectusSeo(
  source: DirectusSeoFields | null,
  fallbackTitle = "",
  fallbackDescription = "",
): PageSeo | null {
  if (!source) {
    return null;
  }

  const title = source.seo_title || source.title || fallbackTitle;
  const description = source.seo_description || fallbackDescription;

  if (!title && !description) {
    return null;
  }

  return {
    title,
    description,
    keywords: normalizeKeywords(source.seo_keywords),
    noindex: Boolean(source.seo_noindex),
    nofollow: Boolean(source.seo_nofollow),
    canonicalUrl: source.canonical_url || null,
    ogTitle: title,
    ogDescription: description,
    ogImage: normalizeAsset(source.og_image, "Open Graph"),
  };
}

function normalizeAsset(
  asset: DirectusFile | string | null,
  fallbackTitle: string,
): SeoAsset | null {
  if (!asset) {
    return null;
  }

  const file =
    typeof asset === "string"
      ? {
          id: asset,
          title: fallbackTitle,
          type: null,
          width: null,
          height: null,
        }
      : asset;

  return {
    id: file.id,
    title: file.title || fallbackTitle,
    url: buildDirectusAssetUrl(file.id, { type: file.type }),
    type: file.type,
    width: file.width,
    height: file.height,
  };
}

function normalizeKeywords(keywords: string | null): string[] {
  if (!keywords) {
    return [];
  }

  return keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}
