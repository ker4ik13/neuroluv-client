export type SeoAsset = {
  id: string;
  title: string;
  url: string;
  type: string | null;
  width: number | null;
  height: number | null;
};

export type SiteSeo = {
  siteName: string;
  shortName: string;
  siteDescription: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  favicon: SeoAsset | null;
  defaultOgImage: SeoAsset | null;
};

export type PageSeo = {
  title: string;
  description: string;
  keywords: string[];
  noindex: boolean;
  nofollow: boolean;
  canonicalUrl: string | null;
  ogTitle: string;
  ogDescription: string;
  ogImage: SeoAsset | null;
};
