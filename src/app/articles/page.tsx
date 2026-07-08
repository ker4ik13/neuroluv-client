import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getArticlesPageData } from "@/shared/api/directus/articles";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildWebPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch, omitSearchParams } from "@/shared/lib/url/search-path";
import { JsonLd } from "@/shared/ui/json-ld";
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
    q?: string;
    sort?: string;
    tag?: string;
    topic?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: ArticlesRouteProps): Promise<Metadata> {
  const params = normalizeExclusiveFilters(
    omitSearchParams(await searchParams, ["page"]),
  );
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
  const params = normalizeExclusiveFilters(
    omitSearchParams(await searchParams, ["page"]),
  );
  const sort = params?.sort === "old" ? "old" : "fresh";
  const q = normalizeQueryParam(params?.q);
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_ARTICLES_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = ARTICLES_PAGE_CONFIG.heroTitle;
  let heroDescription = ARTICLES_PAGE_CONFIG.heroDescription;
  const currentPath = buildPathWithSearch("/articles", params);

  try {
    const [articlesData, exactPage, basePage] = await Promise.all([
      getArticlesPageData({ q, sort, tag, topic }),
      currentPath === "/articles"
        ? Promise.resolve(null)
        : getPageBySlug(currentPath),
      getPageBySlug("/articles"),
    ]);
    const page = exactPage || basePage;

    data = articlesData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = exactPage?.h1 || basePage?.h1 || ARTICLES_PAGE_CONFIG.heroTitle;
    heroDescription =
      exactPage?.h1Description ||
      basePage?.h1Description ||
      ARTICLES_PAGE_CONFIG.heroDescription;
  } catch {
    data = EMPTY_ARTICLES_DATA;
    blocks = [];
  }

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          description: heroDescription,
          title: heroTitle,
          type: "CollectionPage",
          url: currentPath,
        })}
      />
      <NewsPage
        activeQuery={q}
        activeTag={tag}
        activeTopic={topic}
        config={{ ...ARTICLES_PAGE_CONFIG, heroDescription, heroTitle }}
        data={data}
        key={currentPath}
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

function normalizeExclusiveFilters<T extends { tag?: string; topic?: string }>(
  params: Partial<T>,
): Partial<T> {
  if (!params.topic) {
    return params;
  }

  return {
    ...params,
    tag: undefined,
  };
}
