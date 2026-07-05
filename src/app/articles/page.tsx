import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getArticlesPageData } from "@/shared/api/directus/articles";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch } from "@/shared/lib/url/search-path";
import { NewsPage } from "@/widgets/news-page";
import { PageBlocks } from "@/widgets/page-blocks";

const EMPTY_ARTICLES_DATA: NewsPageData = {
  hasMore: false,
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
    page?: string;
    sort?: string;
    tag?: string;
    topic?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: ArticlesRouteProps): Promise<Metadata> {
  const params = await searchParams;
  const currentPath = buildPathWithSearch("/articles", params);
  const exactSeo =
    currentPath === "/articles" ? null : await getPageSeoByPath(currentPath);
  const seo = exactSeo || (await getPageSeoByPath("/articles"));

  return buildPageMetadata(seo, {
    canonicalPath: exactSeo ? currentPath : "/articles",
    fallbackTitle: "Статьи | {SITE_NAME}",
    variables: {
      TITLE: "Статьи",
      URL: currentPath,
    },
  });
}

export default async function ArticlesRoute({ searchParams }: ArticlesRouteProps) {
  const params = await searchParams;
  const paginationPage = normalizePage(params?.page);
  const sort = params?.sort === "old" ? "old" : "fresh";
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_ARTICLES_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = ARTICLES_PAGE_CONFIG.heroTitle;

  try {
    const currentPath = buildPathWithSearch("/articles", params);
    const [articlesData, exactPage, basePage] = await Promise.all([
      getArticlesPageData({ page: paginationPage, sort, tag, topic }),
      currentPath === "/articles"
        ? Promise.resolve(null)
        : getPageBySlug(currentPath),
      getPageBySlug("/articles"),
    ]);
    const page = exactPage || basePage;

    data = articlesData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = page?.h1 || ARTICLES_PAGE_CONFIG.heroTitle;
  } catch {
    data = EMPTY_ARTICLES_DATA;
    blocks = [];
  }

  return (
    <>
      <NewsPage
        activeTag={tag}
        activeTopic={topic}
        config={{ ...ARTICLES_PAGE_CONFIG, heroTitle }}
        currentPage={paginationPage}
        data={data}
        sort={sort}
      />
      <PageBlocks blocks={blocks} />
    </>
  );
}

function normalizePage(value: string | undefined): number {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeQueryParam(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value;
}
