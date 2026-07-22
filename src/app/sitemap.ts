import type { MetadataRoute } from "next";

import {
  getAiIndexablePromptSlugs,
  hasAiPublicFaq,
  hasAiPublicPrompts,
} from "@/shared/api/ai/public";
import { getSitemapEntries } from "@/shared/api/directus/sitemap";
import { SITE_URL } from "@/shared/config/site";

export const revalidate = 60;
export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [siteEntries, promptSlugs, hasPrompts, hasFaq] = await Promise.all([
    getSitemapEntries(),
    getAiIndexablePromptSlugs(),
    hasAiPublicPrompts(),
    hasAiPublicFaq(),
  ]);
  const staticAiPaths = [
    "/ai",
    "/ai/create/photo",
    "/ai/create/text",
    "/ai/create/video",
    "/ai/tools/photo-to-prompt",
    ...(hasPrompts ? ["/ai/prompts"] : []),
    ...(hasFaq ? ["/ai/faq"] : []),
  ];
  const aiEntries: MetadataRoute.Sitemap = [
    ...staticAiPaths.map((path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "/ai" ? 0.9 : 0.7,
    })),
    ...promptSlugs.map((slug) => ({
      url: `${SITE_URL}/ai/prompts/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...new Map([...siteEntries, ...aiEntries].map((entry) => [entry.url, entry])).values()];
}
