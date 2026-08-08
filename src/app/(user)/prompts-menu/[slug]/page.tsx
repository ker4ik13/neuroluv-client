import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { PromptsPageData, PromptSortOrder } from "@/entities/prompt";
import { splitFirstHeroBlock, type PageBlock } from "@/entities/page";
import { getPageBySlug } from "@/shared/api/directus/pages";
import {
  getPromptMenuFilterSeo,
  getPromptsPageData,
} from "@/shared/api/directus/prompts";
import { getPageSeoByPath } from "@/shared/api/directus/seo";
import {
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import {
  buildPaginationHref,
  normalizePaginationPage,
} from "@/shared/lib/url/pagination";
import { buildPathWithSearch, omitSearchParams } from "@/shared/lib/url/search-path";
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
    page?: string;
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

  const routeParams = await searchParams;
  const page = normalizePaginationPage(routeParams?.page);
  const query = omitSearchParams(routeParams, ["page"]);
  const hasNonIndexableQuery = Boolean(query?.q || query?.sort);
  const currentPath = buildPathWithSearch(filter.path, query);
  const paginatedPath = buildPaginationHref(currentPath, page);
  const [seo, filterSeo] = await Promise.all([
    getPageSeoByPath(filter.path),
    getPromptMenuFilterSeo({
      type: filter.type,
      value: filter.value,
    }),
  ]);

  if (!filterSeo) {
    notFound();
  }

  return buildPageMetadata(seo, {
    canonicalPath: page > 1 ? paginatedPath : filter.path,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    noindex:
      page > 1 || hasNonIndexableQuery || Boolean(filterSeo?.seoNoindex),
    variables: {
      TITLE: filterSeo.title,
      URL: paginatedPath,
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

  const filterSeo = await getPromptMenuFilterSeo({
    type: filter.type,
    value: filter.value,
  });

  if (!filterSeo) {
    notFound();
  }

  const routeParams = await searchParams;
  const page = normalizePaginationPage(routeParams?.page);
  const query = omitSearchParams(routeParams, ["page"]);
  const sort = normalizeSort(query?.sort);
  const q = normalizeQueryParam(query?.q);
  let data = EMPTY_PROMPTS_DATA;
  let blocks: PageBlock[] = [];
  let heroTitle = filterSeo.title;
  let heroDescription = filterSeo.description || "Подборка промптов по выбранному фильтру.";
  let dataLoaded = false;
  const currentPath = buildPathWithSearch(filter.path, query);
  const paginatedPath = buildPaginationHref(currentPath, page);

  try {
    const [promptsData, cmsPage] = await Promise.all([
      getPromptsPageData({
        ...getFilterParams(filter),
        includeFacets: true,
        page,
        q,
        sort,
      }),
      getPageBySlug(filter.path),
    ]);

    data = promptsData;
    dataLoaded = true;
    blocks = cmsPage?.blocks || [];
  } catch {
    data = EMPTY_PROMPTS_DATA;
  }

  if (page > 1 && dataLoaded && data.prompts.length === 0) {
    notFound();
  }

  const { hero: heroBlock, remainingBlocks } = splitFirstHeroBlock(blocks);
  heroTitle = heroBlock?.title || heroTitle;
  heroDescription = heroBlock?.description || heroDescription;

  return (
    <>
      <JsonLd
        data={[
          buildWebPageJsonLd({
            description: heroDescription,
            title: heroTitle,
            type: "CollectionPage",
            url: paginatedPath,
          }),
          buildBreadcrumbJsonLd([
            { name: "Главная", url: "/" },
            { name: "Каталог промптов", url: "/prompts-menu" },
            { name: filterSeo.title, url: filter.path },
          ]),
        ]}
      />
      {heroBlock && <PageBlocks blocks={[heroBlock]} />}
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
        initialPage={page}
        key={paginatedPath}
        paginationBasePath={currentPath}
        resetHref="/prompts"
        showDefaultHero={!heroBlock}
        sort={sort}
      />
      <PageBlocks blocks={remainingBlocks} />
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
