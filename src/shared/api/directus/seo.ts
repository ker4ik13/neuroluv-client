import type { PageSeo, SeoAsset, SiteSeo } from "@/entities/seo";
import { directusRequest } from "@/shared/api/directus/client";
import { DIRECTUS_URL } from "@/shared/config/directus";

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
  og_title: string | null;
  og_description: string | null;
  og_image: DirectusFile | string | null;
};

const SITE_SEO_FIELDS = [
  "site_name",
  "short_name",
  "site_description",
  "default_meta_title",
  "default_meta_description",
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

const PAGE_SEO_FIELDS = [
  "title",
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_noindex",
  "seo_nofollow",
  "og_title",
  "og_description",
  "og_image.id",
  "og_image.title",
  "og_image.type",
  "og_image.width",
  "og_image.height",
].join(",");

export async function getSiteSeo(): Promise<SiteSeo> {
  const settings = await directusRequest<DirectusSiteSettingsSeo>(
    `/items/site_settings?fields=${SITE_SEO_FIELDS}`,
    { next: { revalidate: 60 } },
  );

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
    favicon: normalizeAsset(settings.favicon, "Фавикон"),
    defaultOgImage: normalizeAsset(settings.default_og_image, "Open Graph"),
  };
}

export async function getPageSeoBySlug(slug: string): Promise<PageSeo | null> {
  const params = new URLSearchParams({
    fields: PAGE_SEO_FIELDS,
    limit: "1",
  });

  params.set("filter[slug][_eq]", slug);

  const pages = await directusRequest<DirectusPageSeo[]>(
    `/items/pages?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  const page = pages[0];

  if (!page) {
    return null;
  }

  const title = page.seo_title || page.title || "";
  const description = page.seo_description || "";

  return {
    title,
    description,
    keywords: normalizeKeywords(page.seo_keywords),
    noindex: Boolean(page.seo_noindex),
    nofollow: Boolean(page.seo_nofollow),
    ogTitle: page.og_title || title,
    ogDescription: page.og_description || description,
    ogImage: normalizeAsset(page.og_image, "Open Graph"),
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
    url: `${DIRECTUS_URL}/assets/${file.id}`,
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
