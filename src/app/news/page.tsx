import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getNewsPageData } from "@/shared/api/directus/news";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { NewsPage } from "@/widgets/news-page";
import { PageBlocks } from "@/widgets/page-blocks";

const EMPTY_NEWS_DATA: NewsPageData = {
  news: [],
  topics: [],
  tags: [],
};

type NewsRouteProps = {
  searchParams?: Promise<{
    sort?: string;
    tag?: string;
    topic?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/news");

  return buildPageMetadata(seo);
}

export default async function NewsRoute({ searchParams }: NewsRouteProps) {
  const params = await searchParams;
  const sort = params?.sort === "old" ? "old" : "fresh";
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_NEWS_DATA;
  let blocks: PageBlock[] = [];

  try {
    const [newsData, page] = await Promise.all([
      getNewsPageData({ sort, tag, topic }),
      getPageBySlug("/news"),
    ]);

    data = newsData;
    blocks = page?.blocks || [];
  } catch {
    data = EMPTY_NEWS_DATA;
    blocks = [];
  }

  return (
    <>
      <NewsPage activeTag={tag} activeTopic={topic} data={data} sort={sort} />
      <PageBlocks blocks={blocks} />
    </>
  );
}

function normalizeQueryParam(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value;
}
