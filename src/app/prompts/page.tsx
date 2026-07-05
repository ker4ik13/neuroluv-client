import type { Metadata } from "next";

import type { PromptsPageData, PromptSortOrder } from "@/entities/prompt";
import type { PageBlock } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPromptsPageData } from "@/shared/api/directus/prompts";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch } from "@/shared/lib/url/search-path";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptsPage } from "@/widgets/prompts-page";

const EMPTY_PROMPTS_DATA: PromptsPageData = {
  hasMore: false,
  prompts: [],
  sidebarPrompts: [],
  types: [],
  tags: [],
  goals: [],
  neuralNetworks: [],
};

const DEFAULT_HERO_TITLE = "Идеи, промпты и референсы для AI-контента";

type PromptsRouteProps = {
  searchParams?: Promise<{
    goal?: string;
    network?: string;
    page?: string;
    q?: string;
    sort?: string;
    tag?: string;
    type?: string;
  }>;
};

export async function generateMetadata({
  searchParams,
}: PromptsRouteProps): Promise<Metadata> {
  const params = await searchParams;
  const currentPath = buildPathWithSearch("/prompts", params);
  const exactSeo =
    currentPath === "/prompts" ? null : await getPageSeoByPath(currentPath);
  const seo = exactSeo || (await getPageSeoByPath("/prompts"));

  return buildPageMetadata(seo, {
    canonicalPath: exactSeo ? currentPath : "/prompts",
    fallbackTitle: "Промпты | {SITE_NAME}",
    variables: {
      TITLE: "Промпты",
      URL: currentPath,
    },
  });
}

export default async function PromptsRoute({ searchParams }: PromptsRouteProps) {
  const params = await searchParams;
  const paginationPage = normalizePage(params?.page);
  const sort = normalizeSort(params?.sort);
  const type = normalizeQueryParam(params?.type);
  const tag = normalizeQueryParam(params?.tag);
  const network = normalizeQueryParam(params?.network);
  const goal = normalizeQueryParam(params?.goal);
  const q = normalizeQueryParam(params?.q);
  let data = EMPTY_PROMPTS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = DEFAULT_HERO_TITLE;

  try {
    const currentPath = buildPathWithSearch("/prompts", params);
    const [promptsData, exactPage, basePage] = await Promise.all([
      getPromptsPageData({ goal, network, page: paginationPage, q, sort, tag, type }),
      currentPath === "/prompts"
        ? Promise.resolve(null)
        : getPageBySlug(currentPath),
      getPageBySlug("/prompts"),
    ]);
    const page = exactPage || basePage;

    data = promptsData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = page?.h1 || DEFAULT_HERO_TITLE;
  } catch {
    data = EMPTY_PROMPTS_DATA;
    blocks = [];
  }

  return (
    <>
      <PromptsPage
        activeGoal={goal}
        activeNetwork={network}
        activeQuery={q}
        activeTag={tag}
        activeType={type}
        currentPage={paginationPage}
        data={data}
        heroTitle={heroTitle}
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

function normalizeSort(value: string | undefined): PromptSortOrder {
  if (value === "old" || value === "popular") {
    return value;
  }

  return "fresh";
}

function normalizeQueryParam(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value;
}
