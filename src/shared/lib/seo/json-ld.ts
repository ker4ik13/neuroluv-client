import type { NewsItem } from "@/entities/news";
import type { Page } from "@/entities/page";
import type { PromptItem, PromptTaxonomy } from "@/entities/prompt";
import type { SeoAsset, SiteSeo } from "@/entities/seo";
import { SITE_URL } from "@/shared/config/site";

type JsonLdObject = Record<string, unknown>;

type BreadcrumbItem = {
  name: string;
  url: string;
};

type WebPageJsonLdOptions = {
  description?: string | null;
  image?: SeoAsset | null;
  title: string;
  type?: "CollectionPage" | "WebPage";
  url: string;
};

export function buildSiteJsonLd(seo: SiteSeo): JsonLdObject[] {
  const logo = seo.logo || seo.favicon || seo.defaultOgImage;

  return [
    removeEmptyValues({
      "@context": "https://schema.org",
      "@id": `${SITE_URL}/#organization`,
      "@type": "Organization",
      name: seo.siteName,
      url: SITE_URL,
      logo: logo ? buildImageObject(logo) : undefined,
    }),
    removeEmptyValues({
      "@context": "https://schema.org",
      "@id": `${SITE_URL}/#website`,
      "@type": "WebSite",
      description: seo.siteDescription || seo.defaultMetaDescription,
      inLanguage: "ru-RU",
      name: seo.siteName,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      url: SITE_URL,
    }),
  ];
}

export function buildWebPageJsonLd({
  description,
  image,
  title,
  type = "WebPage",
  url,
}: WebPageJsonLdOptions): JsonLdObject {
  const absoluteUrl = toAbsoluteUrl(url);

  return removeEmptyValues({
    "@context": "https://schema.org",
    "@id": `${absoluteUrl}#webpage`,
    "@type": type,
    description,
    image: image ? buildImageObject(image) : undefined,
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    name: title,
    url: absoluteUrl,
  });
}

export function buildPageJsonLd(
  page: Page | null,
  fallback: WebPageJsonLdOptions,
): JsonLdObject {
  return buildWebPageJsonLd({
    ...fallback,
    title: page?.title || fallback.title,
  });
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      item: toAbsoluteUrl(item.url),
      name: item.name,
      position: index + 1,
    })),
  };
}

export function buildNewsArticleJsonLd(item: NewsItem): JsonLdObject {
  return buildArticleJsonLd(item, "NewsArticle");
}

export function buildBlogArticleJsonLd(item: NewsItem): JsonLdObject {
  return buildArticleJsonLd(item, "Article");
}

export function buildPromptJsonLd(item: PromptItem): JsonLdObject {
  const keywords = [
    ...item.types.map((type) => type.title),
    ...item.tags.map((tag) => tag.title),
    item.neuralNetwork?.title,
    item.goal?.title,
  ].filter(isFilledString);

  return removeEmptyValues({
    "@context": "https://schema.org",
    "@id": `${toAbsoluteUrl(item.href)}#creativework`,
    "@type": "CreativeWork",
    about: item.types.map(buildThing),
    author: buildPerson(item.author?.name),
    dateModified: item.updatedAt || item.publishedAt,
    datePublished: item.publishedAt,
    description: item.description,
    image: item.image ? buildImageObject(item.image) : undefined,
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    keywords: keywords.length ? keywords.join(", ") : undefined,
    name: item.title,
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    url: toAbsoluteUrl(item.href),
  });
}

function buildArticleJsonLd(
  item: NewsItem,
  type: "Article" | "NewsArticle",
): JsonLdObject {
  const keywords = [
    item.topic?.title,
    ...item.tags.map((tag) => tag.title),
  ].filter(isFilledString);

  return removeEmptyValues({
    "@context": "https://schema.org",
    "@id": `${toAbsoluteUrl(item.href)}#article`,
    "@type": type,
    author: buildPerson(item.author?.name),
    dateModified: item.updatedAt || item.publishedAt,
    datePublished: item.publishedAt,
    description: item.description,
    headline: item.title,
    image: item.image ? buildImageObject(item.image) : undefined,
    inLanguage: "ru-RU",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    keywords: keywords.length ? keywords.join(", ") : undefined,
    mainEntityOfPage: {
      "@id": `${toAbsoluteUrl(item.href)}#webpage`,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    timeRequired: item.readTime ? `PT${item.readTime}M` : undefined,
    url: toAbsoluteUrl(item.href),
  });
}

function buildImageObject(image: SeoAsset): JsonLdObject {
  return removeEmptyValues({
    "@type": "ImageObject",
    contentUrl: image.url,
    height: image.height || undefined,
    name: image.title,
    url: image.url,
    width: image.width || undefined,
  });
}

function buildPerson(name: string | null | undefined): JsonLdObject | undefined {
  if (!name) {
    return undefined;
  }

  return {
    "@type": "Person",
    name,
  };
}

function buildThing(item: PromptTaxonomy): JsonLdObject {
  return {
    "@type": "Thing",
    name: item.title,
  };
}

function toAbsoluteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const path = value.startsWith("/") ? value : `/${value}`;

  return `${SITE_URL}${path}`;
}

function removeEmptyValues(source: JsonLdObject): JsonLdObject {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => {
      if (value === null || value === undefined || value === "") {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    }),
  );
}

function isFilledString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
