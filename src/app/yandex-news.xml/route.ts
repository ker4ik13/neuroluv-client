import { getRecentNewsForYandexFeed } from "@/shared/api/directus/news";
import { SHARE_SITE_URL } from "@/shared/config/site";
import { buildYandexNewsFeed } from "@/shared/lib/rss/yandex-news-feed";

export const revalidate = 60;

export async function GET(): Promise<Response> {
  try {
    const generatedAt = new Date();
    const items = await getRecentNewsForYandexFeed(generatedAt);
    const feed = buildYandexNewsFeed({
      generatedAt,
      items,
      siteUrl: SHARE_SITE_URL,
    });

    return new Response(feed, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "Content-Type": "application/rss+xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Failed to build Yandex news RSS feed", error);

    return new Response("Yandex news feed is temporarily unavailable", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
      status: 503,
    });
  }
}
