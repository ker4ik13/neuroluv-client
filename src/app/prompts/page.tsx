import type { Metadata } from "next";

import type { PromptsPageData, PromptSortOrder } from "@/entities/prompt";
import type { PageBlock } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPromptsPageData } from "@/shared/api/directus/prompts";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptsPage } from "@/widgets/prompts-page";

const EMPTY_PROMPTS_DATA: PromptsPageData = {
  prompts: [],
  sidebarPrompts: [],
  types: [],
  tags: [],
  goals: [],
  neuralNetworks: [],
};

type PromptsRouteProps = {
  searchParams?: Promise<{
    goal?: string;
    network?: string;
    q?: string;
    sort?: string;
    tag?: string;
    type?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/prompts");

  return buildPageMetadata(seo);
}

export default async function PromptsRoute({ searchParams }: PromptsRouteProps) {
  const params = await searchParams;
  const sort = normalizeSort(params?.sort);
  const type = normalizeQueryParam(params?.type);
  const tag = normalizeQueryParam(params?.tag);
  const network = normalizeQueryParam(params?.network);
  const goal = normalizeQueryParam(params?.goal);
  const q = normalizeQueryParam(params?.q);
  let data = EMPTY_PROMPTS_DATA;
  let blocks: PageBlock[] = [];

  try {
    const [promptsData, page] = await Promise.all([
      getPromptsPageData({ goal, network, q, sort, tag, type }),
      getPageBySlug("/prompts"),
    ]);

    data = promptsData;
    blocks = page?.blocks || [];
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
        data={data}
        sort={sort}
      />
      <PageBlocks blocks={blocks} />
    </>
  );
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
