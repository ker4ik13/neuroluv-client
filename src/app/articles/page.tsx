import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getArticlesPageData } from "@/shared/api/directus/articles";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { NewsPage } from "@/widgets/news-page";
import { PageBlocks } from "@/widgets/page-blocks";

const EMPTY_ARTICLES_DATA: NewsPageData = {
  news: [],
  sidebarNews: [],
  topics: [],
  tags: [],
};

const ARTICLES_PAGE_CONFIG = {
  basePath: "/articles",
  heroDescription:
    "Разбираем AI-инструменты, промпты, визуальные пайплайны и контент-подходы, которые можно применить в реальных проектах.",
  heroEyebrow: "Статьи",
  heroImageSrc: "/images/news-hero-person.png",
  heroTitle: "Практические статьи про AI-контент",
  itemLabel: "Статья",
  latestTitle: "Последние статьи",
};

type ArticlesRouteProps = {
  searchParams?: Promise<{
    sort?: string;
    tag?: string;
    topic?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/articles");

  return buildPageMetadata(seo);
}

export default async function ArticlesRoute({ searchParams }: ArticlesRouteProps) {
  const params = await searchParams;
  const sort = params?.sort === "old" ? "old" : "fresh";
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_ARTICLES_DATA;
  let blocks: PageBlock[] = [];

  try {
    const [articlesData, page] = await Promise.all([
      getArticlesPageData({ sort, tag, topic }),
      getPageBySlug("/articles"),
    ]);

    data = articlesData;
    blocks = page?.blocks || [];
  } catch {
    data = EMPTY_ARTICLES_DATA;
    blocks = [];
  }

  return (
    <>
      <NewsPage
        activeTag={tag}
        activeTopic={topic}
        config={ARTICLES_PAGE_CONFIG}
        data={data}
        sort={sort}
      />
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
