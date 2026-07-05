import type { Metadata } from "next";

import type { NewsPageData } from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { getNewsPageData } from "@/shared/api/directus/news";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch } from "@/shared/lib/url/search-path";
import { NewsPage, type ContentListPageConfig } from "@/widgets/news-page";
import { PageBlocks } from "@/widgets/page-blocks";

const EMPTY_NEWS_DATA: NewsPageData = {
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
    sort?: string;
    tag?: string;
    topic?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: NewsRouteProps): Promise<Metadata> {
  const params = await searchParams;
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
  const params = await searchParams;
  const sort = params?.sort === "old" ? "old" : "fresh";
  const topic = normalizeQueryParam(params?.topic);
  const tag = topic ? null : normalizeQueryParam(params?.tag);
  let data = EMPTY_NEWS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = NEWS_PAGE_CONFIG.heroTitle;

  try {
    const currentPath = buildPathWithSearch("/news", params);
    const [newsData, exactPage, basePage] = await Promise.all([
      getNewsPageData({ sort, tag, topic }),
      currentPath === "/news" ? Promise.resolve(null) : getPageBySlug(currentPath),
      getPageBySlug("/news"),
    ]);
    const page = exactPage || basePage;

    data = newsData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = page?.h1 || NEWS_PAGE_CONFIG.heroTitle;
  } catch {
    data = EMPTY_NEWS_DATA;
    blocks = [];
  }

  return (
    <>
      <NewsPage
        activeTag={tag}
        activeTopic={topic}
        config={{ ...NEWS_PAGE_CONFIG, heroTitle }}
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
