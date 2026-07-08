import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { PromptsPageData, PromptSortOrder, PromptTaxonomy } from "@/entities/prompt";
import type { PageBlock } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import {
  getPromptMenuFilterSeo,
  getPromptsPageData,
} from "@/shared/api/directus/prompts";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildWebPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptsPage } from "@/widgets/prompts-page";

import {
  parsePromptsMenuFilter,
  type PromptsMenuFilter,
} from "../_lib/prompts-menu-filter";

const EMPTY_PROMPTS_DATA: PromptsPageData = {
  hasMore: false,
  prompts: [],
  sidebarPrompts: [],
  totalCount: 0,
  types: [],
  contentKinds: [],
  formats: [],
  tags: [],
  goals: [],
  neuralNetworks: [],
};

type PromptsMenuFilterRouteProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    q?: string;
    sort?: string;
  }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PromptsMenuFilterRouteProps): Promise<Metadata> {
  const filter = await getFilter(params);

  if (!filter) {
    return {};
  }

  const query = await searchParams;
  const hasNonIndexableQuery = Boolean(query?.q || query?.sort);
  const [seo, filterSeo] = await Promise.all([
    getPageSeoByPath(filter.path),
    getPromptMenuFilterSeo({
      type: filter.type,
      value: filter.value,
    }),
  ]);

  return buildPageMetadata(seo, {
    canonicalPath: filter.path,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    noindex: hasNonIndexableQuery || Boolean(filterSeo?.seoNoindex),
    variables: {
      TITLE: filterSeo?.title || getFallbackTitle(filter),
      URL: filter.path,
    },
  });
}

export default async function PromptsMenuFilterRoute({
  params,
  searchParams,
}: PromptsMenuFilterRouteProps) {
  const filter = await getFilter(params);

  if (!filter) {
    notFound();
  }

  const query = await searchParams;
  const sort = normalizeSort(query?.sort);
  const q = normalizeQueryParam(query?.q);
  let data = EMPTY_PROMPTS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = getFallbackTitle(filter);
  let heroDescription = "Подборка промптов по выбранному фильтру.";

  try {
    const [promptsData, page, filterSeo] = await Promise.all([
      getPromptsPageData({
        ...getFilterParams(filter),
        q,
        sort,
      }),
      getPageBySlug(filter.path),
      getPromptMenuFilterSeo({
        type: filter.type,
        value: filter.value,
      }),
    ]);
    const currentTaxonomy = findCurrentTaxonomy(promptsData, filter);

    data = promptsData;
    blocks = page?.blocks || [];
    heroTitle =
      page?.h1 || filterSeo?.title || currentTaxonomy?.title || heroTitle;
    heroDescription =
      page?.h1Description ||
      filterSeo?.description ||
      currentTaxonomy?.description ||
      heroDescription;
  } catch {
    data = EMPTY_PROMPTS_DATA;
  }

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          description: heroDescription,
          title: heroTitle,
          type: "CollectionPage",
          url: filter.path,
        })}
      />
      <PromptsPage
        activeCollection={filter.type === "collection" ? filter.value : null}
        activeGoal={filter.type === "goal" ? filter.value : null}
        activeKind={filter.type === "kind" ? filter.value : null}
        activeNetwork={filter.type === "network" ? filter.value : null}
        activeQuery={q}
        activeTag={filter.type === "tag" ? filter.value : null}
        activeType={null}
        basePath={filter.path}
        data={data}
        heroDescription={heroDescription}
        heroTitle={heroTitle}
        resetHref="/prompts"
        sort={sort}
      />
      <PageBlocks blocks={blocks} />
    </>
  );
}

async function getFilter(
  params: PromptsMenuFilterRouteProps["params"],
): Promise<PromptsMenuFilter | null> {
  const { slug } = await params;

  return parsePromptsMenuFilter(slug);
}

function getFilterParams(filter: PromptsMenuFilter) {
  if (filter.type === "collection") {
    return { collection: filter.value };
  }

  if (filter.type === "kind") {
    return { kind: filter.value };
  }

  if (filter.type === "tag") {
    return { tag: filter.value };
  }

  if (filter.type === "network") {
    return { network: filter.value };
  }

  return { goal: filter.value };
}

function findCurrentTaxonomy(
  data: PromptsPageData,
  filter: PromptsMenuFilter,
): PromptTaxonomy | null {
  if (filter.type === "kind") {
    return data.contentKinds.find((item) => item.slug === filter.value) || null;
  }

  if (filter.type === "tag") {
    return data.tags.find((item) => item.slug === filter.value) || null;
  }

  if (filter.type === "network") {
    return data.neuralNetworks.find((item) => item.slug === filter.value) || null;
  }

  if (filter.type === "collection") {
    return null;
  }

  return data.goals.find((item) => item.slug === filter.value) || null;
}

function getFallbackTitle(filter: PromptsMenuFilter): string {
  if (filter.type === "kind") {
    return "Виды промптов";
  }

  if (filter.type === "collection") {
    return "Подборка промптов";
  }

  return "Промпты";
}

function normalizeSort(value: string | undefined): PromptSortOrder {
  if (value === "old") {
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
