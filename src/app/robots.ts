import type { MetadataRoute } from "next";

import { getRobotsMetadata } from "@/shared/api/directus/sitemap";

export const revalidate = 60;
export const dynamic = "force-static";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return getRobotsMetadata();
}
