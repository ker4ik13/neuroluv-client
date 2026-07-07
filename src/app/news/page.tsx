import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getNewsPageData } from "@/shared/api/directus/news";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch, omitSearchParams } from "@/shared/lib/url/search-path";
import { NewsPage, type ContentListPageConfig } from "@/widgets/news-page";
import { PageBlocks } from "@/widgets/page-blocks";

const EMPTY_NEWS_DATA: NewsPageData = {
  hasMore: false,
  news: [],
  sidebarNews: [],
  topics: [],
  tags: [],
};

const NEWS_PAGE_CONFIG: ContentListPageConfig = {
  basePath: "/news",
  heroDescription:
    "Коротко и по делу рассказываем о новых моделях, инструментах, обновлениях и трендах, которые важны креаторам, маркетологам и бизнесу.",
  heroEyebrow: "Новости",
  heroImageSrc: "/images/news-hero-person.png",
  heroTitle: "Следим за тем, что меняется в AI-сфере",
  itemLabel: "Новости",
  latestTitle: "Последние новости",
};

type NewsRouteProps = {
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
}: NewsRouteProps): Promise<Metadata> {
  const params = omitSearchParams(await searchParams, ["page"]);
  const currentPath = buildPathWithSearch("/news", params);
  const exactSeo =
    currentPath === "/news" ? null : await getPageSeoByPath(currentPath);
  const seo = exactSeo || (await getPageSeoByPath("/news"));

  return buildPageMetadata(seo, {
    canonicalPath: exactSeo ? currentPath : "/news",
    fallbackTitle: "Новости | {SITE_NAME}",
    variables: {
      TITLE: "Новости",
      URL: currentPath,
    },
  });
}

export default async function NewsRoute({ searchParams }: NewsRouteProps) {
  const params = omitSearchParams(await searchParams, ["page"]);
  const sort = params?.sort === "old" ? "old" : "fresh";
  const q = normalizeQueryParam(params?.q);
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_NEWS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = NEWS_PAGE_CONFIG.heroTitle;
  let heroDescription = NEWS_PAGE_CONFIG.heroDescription;
  const currentPath = buildPathWithSearch("/news", params);

  try {
    const [newsData, exactPage, basePage] = await Promise.all([
      getNewsPageData({ q, sort, tag, topic }),
      currentPath === "/news" ? Promise.resolve(null) : getPageBySlug(currentPath),
      getPageBySlug("/news"),
    ]);
    const page = exactPage || basePage;

    data = newsData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = exactPage?.h1 || basePage?.h1 || NEWS_PAGE_CONFIG.heroTitle;
    heroDescription =
      exactPage?.h1Description ||
      basePage?.h1Description ||
      NEWS_PAGE_CONFIG.heroDescription;
  } catch {
    data = EMPTY_NEWS_DATA;
    blocks = [];
  }

  return (
    <>
      <NewsPage
        activeQuery={q}
        activeTag={tag}
        activeTopic={topic}
        config={{ ...NEWS_PAGE_CONFIG, heroDescription, heroTitle }}
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
