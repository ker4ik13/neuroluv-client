import type { Metadata } from "next";

import type { PromptsPageData, PromptSortOrder } from "@/entities/prompt";
import type { PageBlock } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPromptsPageData } from "@/shared/api/directus/prompts";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import { buildWebPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { buildPathWithSearch, omitSearchParams } from "@/shared/lib/url/search-path";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptsPage } from "@/widgets/prompts-page";

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

const DEFAULT_HERO_TITLE = "Идеи, промпты и референсы для AI-контента";
const DEFAULT_HERO_DESCRIPTION =
  "800+ бесплатных промптов. Копируйте, адаптируйте, запускайте.";

type PromptsRouteProps = {
  searchParams?: Promise<{
    goal?: string;
    kind?: string;
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
  const params = omitSearchParams(await searchParams, ["page"]);
  const hasNonIndexableQuery = Boolean(params?.q || params?.sort);
  const currentPath = buildPathWithSearch("/prompts", params);
  const exactSeo =
    currentPath === "/prompts" || hasNonIndexableQuery
      ? null
      : await getPageSeoByPath(currentPath);
  const seo = exactSeo || (await getPageSeoByPath("/prompts"));

  return buildPageMetadata(seo, {
    canonicalPath: exactSeo ? currentPath : "/prompts",
    fallbackTitle: "Промпты | {SITE_NAME}",
    noindex: hasNonIndexableQuery,
    variables: {
      TITLE: "Промпты",
      URL: currentPath,
    },
  });
}

export default async function PromptsRoute({ searchParams }: PromptsRouteProps) {
  const params = omitSearchParams(await searchParams, ["page"]);
  const sort = normalizeSort(params?.sort);
  const type = normalizeQueryParam(params?.type);
  const kind = normalizeQueryParam(params?.kind);
  const tag = normalizeQueryParam(params?.tag);
  const network = normalizeQueryParam(params?.network);
  const goal = normalizeQueryParam(params?.goal);
  const q = normalizeQueryParam(params?.q);
  let data = EMPTY_PROMPTS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = DEFAULT_HERO_TITLE;
  let heroDescription = DEFAULT_HERO_DESCRIPTION;
  const currentPath = buildPathWithSearch("/prompts", params);

  try {
    const [promptsData, exactPage, basePage] = await Promise.all([
      getPromptsPageData({ goal, kind, network, q, sort, tag, type }),
      currentPath === "/prompts"
        ? Promise.resolve(null)
        : getPageBySlug(currentPath),
      getPageBySlug("/prompts"),
    ]);
    const page = exactPage || basePage;

    data = promptsData;
    blocks = page?.blocks.length ? page.blocks : basePage?.blocks || [];
    heroTitle = exactPage?.h1 || basePage?.h1 || DEFAULT_HERO_TITLE;
    heroDescription =
      exactPage?.h1Description ||
      basePage?.h1Description ||
      DEFAULT_HERO_DESCRIPTION;
  } catch {
    data = EMPTY_PROMPTS_DATA;
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
      <PromptsPage
        activeGoal={goal}
        activeKind={kind}
        activeNetwork={network}
        activeQuery={q}
        activeTag={tag}
        activeType={type}
        data={data}
        heroDescription={heroDescription}
        heroTitle={heroTitle}
        key={currentPath}
        sort={sort}
      />
      <PageBlocks blocks={blocks} />
    </>
  );
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
