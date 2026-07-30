import type { NewsItem } from "@/entities/news";
import type { Page, PageBlock } from "@/entities/page";
import type { HeaderNavigation, NavigationItem } from "@/entities/navigation";
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

export function buildSiteJsonLd(
  seo: SiteSeo,
  navigation?: HeaderNavigation | null,
): JsonLdObject[] {
  const logo = seo.logo || seo.favicon || seo.defaultOgImage;
  const navigationJsonLd = buildSiteNavigationJsonLd(navigation?.items || []);

  return [
    removeEmptyValues({
      "@context": "https://schema.org",
      "@id": `${SITE_URL}/#organization`,
      "@type": "Organization",
      description: seo.siteDescription || seo.defaultMetaDescription,
      logo: logo ? buildImageObject(logo) : undefined,
      name: seo.siteName,
      sameAs: navigation?.socialLinks.map((link) => link.url),
      url: SITE_URL,
    }),
    removeEmptyValues({
      "@context": "https://schema.org",
      "@id": `${SITE_URL}/#website`,
      "@type": "WebSite",
      alternateName: seo.shortName !== seo.siteName ? seo.shortName : undefined,
      description: seo.siteDescription || seo.defaultMetaDescription,
      hasPart: navigationJsonLd
        ? {
            "@id": `${SITE_URL}/#primary-navigation`,
          }
        : undefined,
      inLanguage: "ru-RU",
      name: seo.siteName,
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      url: SITE_URL,
    }),
    navigationJsonLd,
  ].filter((item): item is JsonLdObject => item !== null);
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
  const normalizedItems = items
    .map((item) => ({
      name: toPlainText(item.name),
      url: toAbsoluteUrl(item.url),
    }))
    .filter((item) => item.name && isSiteUrl(item.url));
  const pageUrl = normalizedItems.at(-1)?.url || SITE_URL;

  return {
    "@context": "https://schema.org",
    "@id": `${pageUrl}#breadcrumb`,
    "@type": "BreadcrumbList",
    itemListElement: normalizedItems.map((item, index) => ({
      "@type": "ListItem",
      item: item.url,
      name: item.name,
      position: index + 1,
      url: item.url,
    })),
  };
}

export function buildFaqPageJsonLd(blocks: PageBlock[]): JsonLdObject | null {
  const questions = blocks
    .filter(
      (block): block is Extract<PageBlock, { type: "faq" }> => block.type === "faq",
    )
    .flatMap((block) => block.questions)
    .map((question) => ({
      answer: toPlainText(question.answer),
      question: toPlainText(question.title),
    }))
    .filter((item) => item.question && item.answer);

  if (questions.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
      name: item.question,
    })),
  };
}

export function buildSiteNavigationJsonLd(items: NavigationItem[]): JsonLdObject | null {
  const navigationItems = flattenNavigation(items)
    .map((item) => ({
      name: toPlainText(item.label),
      url: toAbsoluteUrl(item.href),
    }))
    .filter((item) => item.name && isSiteUrl(item.url));

  if (navigationItems.length === 0) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@id": `${SITE_URL}/#primary-navigation`,
    "@type": "ItemList",
    itemListElement: navigationItems.map((item, index) => ({
      "@type": "ListItem",
      item: {
        "@type": "SiteNavigationElement",
        name: item.name,
        url: item.url,
      },
      position: index + 1,
    })),
    name: "Основная навигация",
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

function flattenNavigation(items: NavigationItem[]): NavigationItem[] {
  const result: NavigationItem[] = [];
  const seenUrls = new Set<string>();

  function visit(entries: NavigationItem[]) {
    for (const item of entries) {
      const url = toAbsoluteUrl(item.href);

      if (
        item.target === "_self" &&
        !item.href.startsWith("#") &&
        isSiteUrl(url) &&
        !seenUrls.has(url)
      ) {
        result.push(item);
        seenUrls.add(url);
      }

      visit(item.children);
    }
  }

  visit(items);
  return result;
}

function isSiteUrl(value: string): boolean {
  try {
    return new URL(value).origin === new URL(SITE_URL).origin;
  } catch {
    return false;
  }
}

function toPlainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
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
