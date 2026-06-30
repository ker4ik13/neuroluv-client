import type { Metadata } from "next";

import type { PageSeo, SeoAsset, SiteSeo } from "@/entities/seo";
import { SITE_URL } from "@/shared/config/site";

export function buildSiteMetadata(seo: SiteSeo): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: seo.defaultMetaTitle,
      template: `%s | ${seo.shortName}`,
    },
    description: seo.defaultMetaDescription,
    icons: buildIcons(seo.favicon),
    openGraph: {
      title: seo.defaultMetaTitle,
      description: seo.defaultMetaDescription,
      siteName: seo.siteName,
      images: buildOpenGraphImages(seo.defaultOgImage),
      locale: "ru_RU",
      type: "website",
    },
  };
}

export function buildPageMetadata(seo: PageSeo | null): Metadata {
  if (!seo) {
    return {};
  }

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    robots: {
      index: !seo.noindex,
      follow: !seo.nofollow,
    },
    openGraph: {
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: buildOpenGraphImages(seo.ogImage),
    },
  };
}

function buildIcons(favicon: SeoAsset | null): Metadata["icons"] {
  if (!favicon) {
    return undefined;
  }

  return {
    icon: [
      {
        url: favicon.url,
        type: favicon.type || undefined,
      },
    ],
    shortcut: [
      {
        url: favicon.url,
        type: favicon.type || undefined,
      },
    ],
  };
}

function buildOpenGraphImages(image: SeoAsset | null): NonNullable<
  NonNullable<Metadata["openGraph"]>["images"]
> {
  if (!image) {
    return [];
  }

  return [
    {
      url: image.url,
      alt: image.title,
      width: image.width || undefined,
      height: image.height || undefined,
      type: image.type || undefined,
    },
  ];
}
