import type { MetadataRoute } from "next";

import { getSitemapEntries } from "@/shared/api/directus/sitemap";

export const revalidate = 60;
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
