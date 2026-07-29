import type {
  PromptAuthor,
  PromptContentBlock,
  PromptContentButton,
  PromptContentCard,
  PromptContentListItem,
  PromptContentStep,
  PromptCollectionItem,
  PromptCollectionsPageData,
  PromptDetail,
  PromptDetailPageData,
  PromptImage,
  PromptItem,
  PromptsMenuPageData,
  PromptsPageData,
  PromptSortOrder,
  PromptTagGroup,
  PromptTaxonomy,
} from "@/entities/prompt";
import type { PageBlock } from "@/entities/page";
import { directusRequest } from "@/shared/api/directus/client";
import {
  PAGE_BLOCK_FIELDS,
  normalizePageBlocks,
  type DirectusPageBlock,
} from "@/shared/api/directus/pages";
import {
  DIRECTUS_SEO_FIELDS,
  normalizeDirectusSeo,
  type DirectusSeoFields,
} from "@/shared/api/directus/seo";
import { buildDirectusAssetUrl } from "@/shared/config/directus";
import {
  canReadDirectusItemStatus,
  getDirectusPreviewContext,
} from "@/shared/lib/preview/directus-preview";

type DirectusFile = {
  id: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
};

type DirectusTaxonomy = {
  id: number;
  sort: number | null;
  title: string | null;
  slug: string | null;
  description: string | null;
  is_active: boolean | null;
  is_filterable?: boolean | null;
  seo_noindex?: boolean | null;
};

type DirectusPromptFormat = DirectusTaxonomy & {
  code: string | null;
};

type DirectusNeuralNetwork = {
  id: number;
  sort: number | null;
  name: string | null;
  slug: string | null;
  description: string | null;
  is_active: boolean | null;
  seo_noindex: boolean | null;
};

type DirectusAuthor = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  avatar: DirectusFile | string | null;
};

type DirectusPromptTagJunction = {
  sort: number | null;
  prompt_tags_id: DirectusTaxonomy | number | null;
};

type DirectusPromptTypeJunction = {
  sort: number | null;
  prompt_types_id: DirectusTaxonomy | number | null;
};

type DirectusPromptTagContentKindJunction = {
  sort: number | null;
  prompt_content_kinds_id: DirectusTaxonomy | number | null;
};

type DirectusPromptTag = DirectusTaxonomy & {
  content_kinds?: DirectusPromptTagContentKindJunction[];
};

type DirectusPromptImageJunction = {
  sort: number | null;
  directus_files_id: DirectusFile | string | null;
};

type DirectusContentListItem = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
};

type DirectusContentCard = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  link: string | null;
  image: DirectusFile | string | null;
};

type DirectusContentStep = {
  id: number;
  sort: number | null;
  is_active: boolean | null;
  title: string | null;
  description: string | null;
};

type DirectusContentButton = {
  id: number;
  label: string | null;
  url: string | null;
  target: "_self" | "_blank" | null;
  variant: "primary" | "secondary" | "outline" | null;
  is_active: boolean | null;
};

type DirectusContentButtonJunction = {
  sort: number | null;
  hero_buttons_id: DirectusContentButton | number | null;
};

type DirectusContentHtml = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  content: string | null;
};

type DirectusContentText = DirectusContentHtml;

type DirectusContentQuote = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  text: string | null;
  author: string | null;
};

type DirectusContentList = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  items?: DirectusContentListItem[];
};

type DirectusContentImage = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  caption: string | null;
  image: DirectusFile | string | null;
};

type DirectusContentVideo = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  caption: string | null;
  video: DirectusFile | string | null;
  video_url: string | null;
};

type DirectusContentCta = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  description: string | null;
  buttons?: DirectusContentButtonJunction[];
};

type DirectusContentCards = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  cards?: DirectusContentCard[];
};

type DirectusContentSteps = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  steps?: DirectusContentStep[];
};

type DirectusContentBlock = {
  id: number;
  sort: number | null;
  collection: string | null;
  item:
    | DirectusContentHtml
    | DirectusContentText
    | DirectusContentQuote
    | DirectusContentList
    | DirectusContentImage
    | DirectusContentVideo
    | DirectusContentCta
    | DirectusContentCards
    | DirectusContentSteps
    | number
    | string
    | null;
};

type DirectusPromptItem = {
  id: number;
  sort: number | null;
  status: "published" | "draft" | "archived" | string | null;
  title: string | null;
  slug: string | null;
  description: string | null;
  neural_network: DirectusNeuralNetwork | number | null;
  format: string | null;
  content_kind: string | null;
  content_kind_ref: DirectusTaxonomy | number | null;
  format_ref: DirectusPromptFormat | number | null;
  autoplay: boolean | null;
  ai_enabled: boolean | null;
  is_paid: boolean | null;
  difficulty: string | null;
  author: DirectusAuthor | string | null;
  published_at: string | null;
  updated_at: string | null;
  views_count: number | null;
  goal: DirectusTaxonomy | number | null;
  prompt: string | null;
  tags?: DirectusPromptTagJunction[];
  types?: DirectusPromptTypeJunction[];
  images?: DirectusPromptImageJunction[];
  content_blocks?: DirectusContentBlock[];
} & DirectusSeoFields;

type DirectusAggregateCount = {
  count?: {
    id?: number | string | null;
  };
};

type DirectusPromptGoalCount = DirectusAggregateCount & {
  goal?: number | string | DirectusTaxonomy | null;
};

type DirectusPromptKindCount = DirectusAggregateCount & {
  content_kind?: string | null;
  content_kind_ref?: number | string | DirectusTaxonomy | null;
};

type DirectusPromptNetworkCount = DirectusAggregateCount & {
  neural_network?: number | string | DirectusNeuralNetwork | null;
};

type DirectusPromptCollectionCount = DirectusAggregateCount & {
  prompt_collections_id?: number | string | DirectusPromptCollection | null;
};

type DirectusPromptTagCount = DirectusAggregateCount & {
  prompt_tags_id?: number | string | DirectusTaxonomy | null;
};

type DirectusPromptCollectionPromptJunction = {
  prompt_collections_id?: number | DirectusPromptCollection | null;
  prompts_id: number | DirectusPromptItem | null;
};

type DirectusPromptCollection = {
  id: number;
  sort: number | null;
  status: "published" | "draft" | "archived" | string | null;
  is_active: boolean | null;
  title: string | null;
  slug: string | null;
  description: string | null;
  cover: DirectusFile | string | null;
  published_at: string | null;
  updated_at: string | null;
  seo_noindex: boolean | null;
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

const PROMPT_CONTENT_KIND_LABELS: Record<string, string> = {
  audio: "Аудио / голос",
  code: "Код",
  design: "Дизайн / баннеры",
  photo: "Фото",
  text: "Текст",
  video: "Видео",
};

const PROMPT_FIELDS = [
  "id",
  "sort",
  "status",
  "title",
  "slug",
  "description",
  "format",
  "content_kind",
  "content_kind_ref.id",
  "content_kind_ref.sort",
  "content_kind_ref.title",
  "content_kind_ref.slug",
  "content_kind_ref.description",
  "content_kind_ref.is_active",
  "format_ref.id",
  "format_ref.sort",
  "format_ref.title",
  "format_ref.slug",
  "format_ref.description",
  "format_ref.is_active",
  "format_ref.code",
  "autoplay",
  "ai_enabled",
  "is_paid",
  "difficulty",
  "published_at",
  "updated_at",
  "views_count",
  "neural_network.id",
  "neural_network.sort",
  "neural_network.name",
  "neural_network.slug",
  "neural_network.description",
  "neural_network.is_active",
  "goal.id",
  "goal.sort",
  "goal.title",
  "goal.slug",
  "goal.description",
  "goal.is_active",
  "author.id",
  "author.first_name",
  "author.last_name",
  "author.title",
  "author.avatar.id",
  "author.avatar.title",
  "author.avatar.type",
  "author.avatar.width",
  "author.avatar.height",
  "tags.sort",
  "tags.prompt_tags_id.id",
  "tags.prompt_tags_id.sort",
  "tags.prompt_tags_id.title",
  "tags.prompt_tags_id.slug",
  "tags.prompt_tags_id.is_active",
  "images.sort",
  "images.directus_files_id.id",
  "images.directus_files_id.title",
  "images.directus_files_id.type",
  "images.directus_files_id.width",
  "images.directus_files_id.height",
  DIRECTUS_SEO_FIELDS,
].join(",");

const PROMPT_DETAIL_FIELDS = [
  PROMPT_FIELDS,
  "prompt",
  "content_blocks.id",
  "content_blocks.sort",
  "content_blocks.collection",
  "content_blocks.item:content_html.id",
  "content_blocks.item:content_html.is_active",
  "content_blocks.item:content_html.title",
  "content_blocks.item:content_html.content",
  "content_blocks.item:content_text.id",
  "content_blocks.item:content_text.is_active",
  "content_blocks.item:content_text.title",
  "content_blocks.item:content_text.content",
  "content_blocks.item:content_quote.id",
  "content_blocks.item:content_quote.is_active",
  "content_blocks.item:content_quote.title",
  "content_blocks.item:content_quote.text",
  "content_blocks.item:content_quote.author",
  "content_blocks.item:content_list.id",
  "content_blocks.item:content_list.is_active",
  "content_blocks.item:content_list.title",
  "content_blocks.item:content_list.items.id",
  "content_blocks.item:content_list.items.sort",
  "content_blocks.item:content_list.items.title",
  "content_blocks.item:content_list.items.description",
  "content_blocks.item:content_image.id",
  "content_blocks.item:content_image.is_active",
  "content_blocks.item:content_image.title",
  "content_blocks.item:content_image.caption",
  "content_blocks.item:content_image.image.id",
  "content_blocks.item:content_image.image.title",
  "content_blocks.item:content_image.image.type",
  "content_blocks.item:content_image.image.width",
  "content_blocks.item:content_image.image.height",
  "content_blocks.item:content_video.id",
  "content_blocks.item:content_video.is_active",
  "content_blocks.item:content_video.title",
  "content_blocks.item:content_video.caption",
  "content_blocks.item:content_video.video.id",
  "content_blocks.item:content_video.video.title",
  "content_blocks.item:content_video.video.type",
  "content_blocks.item:content_video.video.width",
  "content_blocks.item:content_video.video.height",
  "content_blocks.item:content_video.video_url",
  "content_blocks.item:content_cta.id",
  "content_blocks.item:content_cta.is_active",
  "content_blocks.item:content_cta.title",
  "content_blocks.item:content_cta.description",
  "content_blocks.item:content_cta.buttons.sort",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.id",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.label",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.url",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.target",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.variant",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.is_active",
  "content_blocks.item:content_cards.id",
  "content_blocks.item:content_cards.is_active",
  "content_blocks.item:content_cards.title",
  "content_blocks.item:content_cards.cards.id",
  "content_blocks.item:content_cards.cards.sort",
  "content_blocks.item:content_cards.cards.title",
  "content_blocks.item:content_cards.cards.description",
  "content_blocks.item:content_cards.cards.link",
  "content_blocks.item:content_cards.cards.image.id",
  "content_blocks.item:content_cards.cards.image.title",
  "content_blocks.item:content_cards.cards.image.type",
  "content_blocks.item:content_cards.cards.image.width",
  "content_blocks.item:content_cards.cards.image.height",
  "content_blocks.item:content_steps.id",
  "content_blocks.item:content_steps.is_active",
  "content_blocks.item:content_steps.title",
  "content_blocks.item:content_steps.steps.id",
  "content_blocks.item:content_steps.steps.sort",
  "content_blocks.item:content_steps.steps.is_active",
  "content_blocks.item:content_steps.steps.title",
  "content_blocks.item:content_steps.steps.description",
].join(",");

const TAXONOMY_FIELDS = [
  "id",
  "sort",
  "title",
  "slug",
  "description",
  "is_active",
  "seo_noindex",
].join(",");

const PROMPT_TAG_FIELDS = [
  TAXONOMY_FIELDS,
  "is_filterable",
  "content_kinds.sort",
  "content_kinds.prompt_content_kinds_id.id",
  "content_kinds.prompt_content_kinds_id.sort",
  "content_kinds.prompt_content_kinds_id.title",
  "content_kinds.prompt_content_kinds_id.slug",
  "content_kinds.prompt_content_kinds_id.is_active",
].join(",");

const NETWORK_FIELDS = [
  "id",
  "sort",
  "name",
  "slug",
  "description",
  "is_active",
  "seo_noindex",
].join(",");

const PROMPT_COLLECTION_FIELDS = [
  "id",
  "sort",
  "status",
  "is_active",
  "title",
  "slug",
  "description",
  "cover.id",
  "cover.title",
  "cover.type",
  "cover.width",
  "cover.height",
  "published_at",
  "updated_at",
  "seo_noindex",
].join(",");

type PromptDetailPageDataWithBlocks = PromptDetailPageData & {
  blocks: PageBlock[];
};

const PAGE_SIZE = 30;
const PROMPT_COLLECTIONS_PAGE_SIZE = 60;

export type GetPromptsPageDataParams = {
  collection?: string | null;
  goal?: string | null;
  kind?: string | null;
  network?: string | null;
  page?: number;
  q?: string | null;
  sort?: PromptSortOrder;
  tag?: string | null;
  type?: string | null;
};

export type PromptMenuFilterType =
  | "collection"
  | "goal"
  | "kind"
  | "network"
  | "tag";

export type PromptMenuFilterSeo = {
  description: string;
  seoNoindex: boolean;
  title: string;
};

export async function getPromptsPageData({
  collection,
  goal,
  kind,
  network,
  page = 1,
  q,
  sort = "fresh",
  tag,
  type,
}: GetPromptsPageDataParams = {}): Promise<PromptsPageData> {
  const collectionPromptIds = collection
    ? await getPromptIdsByCollectionSlug(collection)
    : null;
  const requestedLimit = getListLimit(page);
  const promptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: String(requestedLimit + 1),
    sort: getSort(sort),
  });

  applyPublishedFilter(promptsParams);
  applyPromptFilters(promptsParams, {
    collectionPromptIds,
    goal,
    kind,
    network,
    q,
    tag,
    type,
  });

  const sidebarPromptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: "100",
    sort: "-views_count,-published_at,-id",
  });
  const totalParams = new URLSearchParams();
  const goalCountsParams = new URLSearchParams();
  const kindCountsParams = new URLSearchParams();
  const tagCountsParams = new URLSearchParams();

  totalParams.set("aggregate[count]", "id");
  goalCountsParams.set("aggregate[count]", "id");
  goalCountsParams.set("groupBy[]", "goal");
  kindCountsParams.set("aggregate[count]", "id");
  kindCountsParams.set("groupBy[]", "content_kind_ref");
  tagCountsParams.set("aggregate[count]", "id");
  tagCountsParams.set("groupBy[]", "prompt_tags_id");
  tagCountsParams.set("filter[prompts_id][status][_eq]", "published");
  applyPublishedFilter(sidebarPromptsParams);
  applyPublishedFilter(totalParams);
  applyPublishedFilter(goalCountsParams);
  applyPublishedFilter(kindCountsParams);
  applyPromptFilters(totalParams, {
    collectionPromptIds,
    goal,
    kind,
    network,
    q,
    tag,
    type,
  });

  const [
    prompts,
    sidebarPrompts,
    totalRows,
    goalCountRows,
    kindCountRows,
    tagCountRows,
    contentKinds,
    formats,
    tags,
    goals,
    neuralNetworks,
  ] =
    await Promise.all([
      directusRequest<DirectusPromptItem[]>(
        `/items/prompts?${promptsParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusPromptItem[]>(
        `/items/prompts?${sidebarPromptsParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusAggregateCount[]>(
        `/items/prompts?${totalParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusPromptGoalCount[]>(
        `/items/prompts?${goalCountsParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusPromptKindCount[]>(
        `/items/prompts?${kindCountsParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusPromptTagCount[]>(
        `/items/prompts_tags?${tagCountsParams.toString()}`,
        [],
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusTaxonomy[]>(
        `/items/prompt_content_kinds?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
        [],
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusPromptFormat[]>(
        `/items/prompt_formats?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS},code`,
        [],
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusTaxonomy[]>(
        `/items/prompt_tags?filter[is_active][_eq]=true&filter[is_filterable][_eq]=true&sort=sort&fields=${PROMPT_TAG_FIELDS}`,
        [],
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusTaxonomy[]>(
        `/items/prompt_goals?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS},is_filterable`,
        [],
        { next: { revalidate: 60 } },
      ),
      optionalDirectusRequest<DirectusNeuralNetwork[]>(
        `/items/neural_networks?filter[is_active][_eq]=true&sort=sort&fields=${NETWORK_FIELDS}`,
        [],
        { next: { revalidate: 60 } },
      ),
    ]);

  const normalizedPrompts = prompts.map((item) => normalizePromptItem(item)).filter(isPromptItem);
  const goalCounts = normalizeGoalCounts(goalCountRows);
  const kindCounts = normalizeKindCounts(kindCountRows);
  const tagCounts = normalizeTagCounts(tagCountRows);

  return {
    hasMore: normalizedPrompts.length > requestedLimit,
    prompts: normalizedPrompts.slice(0, requestedLimit),
    sidebarPrompts: sidebarPrompts.map((item) => normalizePromptItem(item)).filter(isPromptItem),
    totalCount: normalizeAggregateCount(totalRows),
    types: [],
    contentKinds: contentKinds
      .map((item) => normalizeTaxonomyWithCount(item, kindCounts))
      .filter(isTaxonomy),
    formats: formats.map(normalizeTaxonomy).filter(isTaxonomy),
    tags: tags
      .map((item) => normalizeTaxonomyWithCount(item, tagCounts))
      .filter(isTaxonomy)
      .filter((item) => (item.count || 0) > 0),
    goals: goals
      .map((item) => normalizeTaxonomyWithCount(item, goalCounts))
      .filter(isTaxonomy),
    neuralNetworks: neuralNetworks.map(normalizeNetwork).filter(isTaxonomy),
  };
}

export async function getPromptsMenuPageData(): Promise<PromptsMenuPageData> {
  const goalCountsParams = new URLSearchParams();
  const kindCountsParams = new URLSearchParams();
  const networkCountsParams = new URLSearchParams();
  const tagCountsParams = new URLSearchParams();

  goalCountsParams.set("aggregate[count]", "id");
  goalCountsParams.set("groupBy[]", "goal");
  kindCountsParams.set("aggregate[count]", "id");
  kindCountsParams.set("groupBy[]", "content_kind_ref");
  networkCountsParams.set("aggregate[count]", "id");
  networkCountsParams.set("groupBy[]", "neural_network");
  tagCountsParams.set("aggregate[count]", "id");
  tagCountsParams.set("groupBy[]", "prompt_tags_id");
  tagCountsParams.set("filter[prompts_id][status][_eq]", "published");
  applyPublishedFilter(goalCountsParams);
  applyPublishedFilter(kindCountsParams);
  applyPublishedFilter(networkCountsParams);

  const [
    contentKinds,
    kindCountRows,
    neuralNetworks,
    networkCountRows,
    goals,
    goalCountRows,
    tags,
    tagCountRows,
    collectionsPage,
  ] = await Promise.all([
    optionalDirectusRequest<DirectusTaxonomy[]>(
      `/items/prompt_content_kinds?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
      [],
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusPromptKindCount[]>(
      `/items/prompts?${kindCountsParams.toString()}`,
      { next: { revalidate: 60 } },
    ),
    optionalDirectusRequest<DirectusNeuralNetwork[]>(
      `/items/neural_networks?filter[is_active][_eq]=true&sort=sort&fields=${NETWORK_FIELDS}`,
      [],
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusPromptNetworkCount[]>(
      `/items/prompts?${networkCountsParams.toString()}`,
      { next: { revalidate: 60 } },
    ),
    optionalDirectusRequest<DirectusTaxonomy[]>(
      `/items/prompt_goals?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
      [],
      { next: { revalidate: 60 } },
    ),
    directusRequest<DirectusPromptGoalCount[]>(
      `/items/prompts?${goalCountsParams.toString()}`,
      { next: { revalidate: 60 } },
    ),
    optionalDirectusRequest<DirectusPromptTag[]>(
      `/items/prompt_tags?filter[is_active][_eq]=true&sort=sort&fields=${PROMPT_TAG_FIELDS}`,
      [],
      { next: { revalidate: 60 } },
    ),
    optionalDirectusRequest<DirectusPromptTagCount[]>(
      `/items/prompts_tags?${tagCountsParams.toString()}`,
      [],
      { next: { revalidate: 60 } },
    ),
    getPromptCollectionsPageData({ page: 1 }),
  ]);

  const goalCounts = normalizeGoalCounts(goalCountRows);
  const kindCounts = normalizeKindCounts(kindCountRows);
  const networkCounts = normalizeNetworkCounts(networkCountRows);
  const tagCounts = normalizeTagCounts(tagCountRows);
  const normalizedContentKinds = contentKinds
    .map((item) => normalizeTaxonomyWithCount(item, kindCounts))
    .filter(isTaxonomy);

  return {
    collections: collectionsPage.items,
    collectionsHasMore: collectionsPage.hasMore,
    contentKinds: normalizedContentKinds,
    goals: goals
      .map((item) => normalizeTaxonomyWithCount(item, goalCounts))
      .filter(isTaxonomy),
    neuralNetworks: neuralNetworks
      .map((item) => normalizeNetworkWithCount(item, networkCounts))
      .filter(isTaxonomy),
    tagGroups: normalizeTagGroups(tags, normalizedContentKinds, tagCounts),
  };
}

export async function getPromptMenuFilterSeo({
  type,
  value,
}: {
  type: PromptMenuFilterType;
  value: string;
}): Promise<PromptMenuFilterSeo | null> {
  if (type === "network") {
    const item = await getPromptMenuFilterItem<DirectusNeuralNetwork>(
      "neural_networks",
      value,
      "name,slug,description,is_active,seo_noindex",
    );

    if (!item?.name || item.is_active === false) {
      return null;
    }

    return {
      description: item.description || "",
      seoNoindex: Boolean(item.seo_noindex),
      title: item.name,
    };
  }

  if (type === "collection") {
    const item = await getPromptMenuFilterItem<DirectusPromptCollection>(
      "prompt_collections",
      value,
      "title,slug,description,status,is_active,seo_noindex",
    );

    if (!item?.title || item.status !== "published" || item.is_active === false) {
      return null;
    }

    return {
      description: item.description || "",
      seoNoindex: Boolean(item.seo_noindex),
      title: item.title,
    };
  }

  const collectionByType: Record<
    Exclude<PromptMenuFilterType, "collection" | "network">,
    string
  > = {
    goal: "prompt_goals",
    kind: "prompt_content_kinds",
    tag: "prompt_tags",
  };
  const item = await getPromptMenuFilterItem<DirectusTaxonomy>(
    collectionByType[type],
    value,
    TAXONOMY_FIELDS,
  );

  if (!item?.title || item.is_active === false) {
    return null;
  }

  return {
    description: item.description || "",
    seoNoindex: Boolean(item.seo_noindex),
    title: item.title,
  };
}

export async function getPromptCollectionsPageData({
  page = 1,
}: {
  page?: number;
} = {}): Promise<PromptCollectionsPageData> {
  const limit = PROMPT_COLLECTIONS_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * limit;
  const collectionsParams = new URLSearchParams({
    fields: PROMPT_COLLECTION_FIELDS,
    limit: String(limit + 1),
    offset: String(offset),
    sort: "-published_at,-id",
  });
  const collectionCountsParams = new URLSearchParams();

  applyPublishedFilter(collectionsParams);
  collectionsParams.set("filter[is_active][_eq]", "true");
  collectionCountsParams.set("aggregate[count]", "id");
  collectionCountsParams.set("groupBy[]", "prompt_collections_id");

  const [collections, collectionCountRows] = await Promise.all([
    optionalDirectusRequest<DirectusPromptCollection[]>(
      `/items/prompt_collections?${collectionsParams.toString()}`,
      [],
      { next: { revalidate: 60 } },
    ),
    optionalDirectusRequest<DirectusPromptCollectionCount[]>(
      `/items/prompt_collections_prompts?${collectionCountsParams.toString()}`,
      [],
      { next: { revalidate: 60 } },
    ),
  ]);
  const collectionCounts = normalizeCollectionCounts(collectionCountRows);
  const items = collections
    .map((item) => normalizePromptCollection(item, collectionCounts))
    .filter(isPromptCollection);

  return {
    hasMore: items.length > limit,
    items: items.slice(0, limit),
  };
}

async function getPromptMenuFilterItem<T>(
  collection: string,
  slug: string,
  fields: string,
): Promise<T | null> {
  const params = new URLSearchParams({
    fields,
    limit: "1",
  });

  params.set("filter[slug][_eq]", slug);

  const items = await directusRequest<T[]>(
    `/items/${collection}?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return items[0] || null;
}

function normalizeAggregateCount(rows: DirectusAggregateCount[]): number {
  const count = Number(rows[0]?.count?.id || 0);

  return Number.isFinite(count) ? count : 0;
}

async function optionalDirectusRequest<T>(
  path: string,
  fallback: T,
  options: { next?: NextFetchRequestConfig } = {},
): Promise<T> {
  try {
    return await directusRequest<T>(path, options);
  } catch {
    return fallback;
  }
}

function normalizeGoalCounts(rows: DirectusPromptGoalCount[]): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.goal) {
      return;
    }

    const goalId =
      typeof row.goal === "object" && row.goal !== null
        ? row.goal.id
        : Number(row.goal);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(goalId) && Number.isFinite(count)) {
      counts.set(goalId, count);
    }
  });

  return counts;
}

function normalizeKindCounts(rows: DirectusPromptKindCount[]): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.content_kind_ref) {
      return;
    }

    const kindId =
      typeof row.content_kind_ref === "object" && row.content_kind_ref !== null
        ? row.content_kind_ref.id
        : Number(row.content_kind_ref);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(kindId) && Number.isFinite(count)) {
      counts.set(kindId, count);
    }
  });

  return counts;
}

function normalizeNetworkCounts(
  rows: DirectusPromptNetworkCount[],
): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.neural_network) {
      return;
    }

    const networkId =
      typeof row.neural_network === "object" && row.neural_network !== null
        ? row.neural_network.id
        : Number(row.neural_network);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(networkId) && Number.isFinite(count)) {
      counts.set(networkId, count);
    }
  });

  return counts;
}

function normalizeCollectionCounts(
  rows: DirectusPromptCollectionCount[],
): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.prompt_collections_id) {
      return;
    }

    const collectionId =
      typeof row.prompt_collections_id === "object" &&
      row.prompt_collections_id !== null
        ? row.prompt_collections_id.id
        : Number(row.prompt_collections_id);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(collectionId) && Number.isFinite(count)) {
      counts.set(collectionId, count);
    }
  });

  return counts;
}

function normalizeTagCounts(rows: DirectusPromptTagCount[]): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.prompt_tags_id) {
      return;
    }

    const tagId =
      typeof row.prompt_tags_id === "object" && row.prompt_tags_id !== null
        ? row.prompt_tags_id.id
        : Number(row.prompt_tags_id);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(tagId) && Number.isFinite(count)) {
      counts.set(tagId, count);
    }
  });

  return counts;
}

function normalizeTagGroups(
  tags: DirectusPromptTag[],
  contentKinds: PromptTaxonomy[],
  counts: Map<number, number>,
): PromptTagGroup[] {
  const groups = new Map<
    string,
    {
      kind: PromptTaxonomy;
      tags: Map<string, PromptTaxonomy>;
    }
  >();

  contentKinds.forEach((kind) => {
    groups.set(kind.slug, {
      kind,
      tags: new Map(),
    });
  });

  tags.forEach((tag) => {
    const normalizedTag = normalizeTaxonomyWithCount(tag, counts);

    if (!normalizedTag || (normalizedTag.count || 0) <= 0) {
      return;
    }

    tag.content_kinds
      ?.map((junction) => normalizeTaxonomy(junction.prompt_content_kinds_id))
      .filter(isTaxonomy)
      .forEach((kind) => {
        const group = groups.get(kind.slug);

        if (!group) {
          return;
        }

        group.tags.set(normalizedTag.slug, normalizedTag);
      });
  });

  return [...groups.values()]
    .map((group) => ({
      kind: group.kind,
      tags: [...group.tags.values()].sort(compareTaxonomiesByCount),
    }))
    .filter((group) => group.tags.length > 0);
}

function compareTaxonomiesByCount(
  first: PromptTaxonomy,
  second: PromptTaxonomy,
): number {
  const countDifference = (second.count || 0) - (first.count || 0);

  if (countDifference !== 0) {
    return countDifference;
  }

  return first.title.localeCompare(second.title, "ru");
}

function normalizeNetworkWithCount(
  network: DirectusNeuralNetwork,
  counts: Map<number, number>,
): PromptTaxonomy | null {
  const normalized = normalizeNetwork(network);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    count: counts.get(normalized.id) || 0,
  };
}

function normalizeTaxonomyWithCount(
  taxonomy: DirectusTaxonomy,
  counts: Map<number, number>,
): PromptTaxonomy | null {
  const normalized = normalizeTaxonomy(taxonomy);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    count: counts.get(normalized.id) || 0,
  };
}

function getListLimit(page: number): number {
  return Math.max(1, page) * PAGE_SIZE;
}

async function getPromptIdsByCollectionSlug(slug: string): Promise<number[]> {
  const params = new URLSearchParams({
    fields: "prompts_id",
    limit: "-1",
  });

  params.set("filter[prompt_collections_id][slug][_eq]", slug);

  const rows = await optionalDirectusRequest<DirectusPromptCollectionPromptJunction[]>(
    `/items/prompt_collections_prompts?${params.toString()}`,
    [],
    { next: { revalidate: 60 } },
  );

  return rows
    .map((row) =>
      typeof row.prompts_id === "object" && row.prompts_id !== null
        ? row.prompts_id.id
        : Number(row.prompts_id),
    )
    .filter((id) => Number.isFinite(id));
}

export async function getPromptBySlug(slug: string): Promise<PromptDetail | null> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: PROMPT_DETAIL_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    applyPublishedFilter(params);
  }

  params.set("filter[slug][_eq]", slug);

  const prompts = await directusRequest<DirectusPromptItem[]>(
    `/items/prompts?${params.toString()}`,
    preview.requestOptions,
  );

  return normalizePromptDetail(prompts[0] || null, preview.enabled);
}

export async function getRelatedPrompts(
  current: PromptItem,
  limit = 6,
): Promise<PromptItem[]> {
  const collectionPromptIds = await getRelatedPromptIdsByCurrentCollections(current.id);
  const hasCollectionRelated = Boolean(collectionPromptIds?.length);

  if (!hasCollectionRelated && !current.goal) {
    return [];
  }

  const params = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: String(limit),
    sort: "-views_count,-published_at,-id",
  });

  applyPublishedFilter(params);
  params.set("filter[id][_neq]", String(current.id));

  if (current.contentKind) {
    params.set("filter[content_kind_ref][slug][_eq]", current.contentKind.slug);
  }

  if (hasCollectionRelated && collectionPromptIds) {
    params.set("filter[id][_in]", collectionPromptIds.join(","));
  } else if (current.goal) {
    params.set("filter[goal][slug][_eq]", current.goal.slug);
  }

  const prompts = await directusRequest<DirectusPromptItem[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return prompts.map((item) => normalizePromptItem(item)).filter(isPromptItem);
}

export async function getPromptDetailPageData(
  slug: string,
): Promise<PromptDetailPageDataWithBlocks | null> {
  const item = await getPromptBySlug(slug);

  if (!item) {
    return null;
  }

  const [related, blocks] = await Promise.all([
    getRelatedPrompts(item),
    getPromptPageBlocksBySlug(slug),
  ]);

  return {
    blocks,
    item,
    related,
  };
}

async function getPromptPageBlocksBySlug(slug: string): Promise<PageBlock[]> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: PAGE_BLOCK_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    applyPublishedFilter(params);
  }

  params.set("filter[slug][_eq]", slug);

  const prompts = await directusRequest<{ blocks?: DirectusPageBlock[] }[]>(
    `/items/prompts?${params.toString()}`,
    preview.requestOptions,
  );

  return normalizePageBlocks(prompts[0]?.blocks || []);
}

async function getRelatedPromptIdsByCurrentCollections(
  currentId: number,
): Promise<number[] | null> {
  const collectionRowsParams = new URLSearchParams({
    fields: "prompt_collections_id.id,prompt_collections_id.status,prompt_collections_id.is_active",
    limit: "-1",
  });

  collectionRowsParams.set("filter[prompts_id][_eq]", String(currentId));

  const collectionRows = await optionalDirectusRequest<
    DirectusPromptCollectionPromptJunction[]
  >(
    `/items/prompt_collections_prompts?${collectionRowsParams.toString()}`,
    [],
    { next: { revalidate: 60 } },
  );
  const collectionIds = [
    ...new Set(
      collectionRows
        .map((row) => normalizeCollectionId(row.prompt_collections_id))
        .filter((id): id is number => id !== null),
    ),
  ];

  if (collectionIds.length === 0) {
    return null;
  }

  const promptRowsParams = new URLSearchParams({
    fields: "prompts_id",
    limit: "-1",
  });

  promptRowsParams.set("filter[prompt_collections_id][_in]", collectionIds.join(","));

  const promptRows = await optionalDirectusRequest<
    DirectusPromptCollectionPromptJunction[]
  >(
    `/items/prompt_collections_prompts?${promptRowsParams.toString()}`,
    [],
    { next: { revalidate: 60 } },
  );

  return [
    ...new Set(
      promptRows
        .map((row) =>
          typeof row.prompts_id === "object" && row.prompts_id !== null
            ? row.prompts_id.id
            : Number(row.prompts_id),
        )
        .filter((id) => Number.isFinite(id) && id !== currentId),
    ),
  ];
}

function normalizeCollectionId(
  collection: DirectusPromptCollectionPromptJunction["prompt_collections_id"],
): number | null {
  if (!collection) {
    return null;
  }

  if (typeof collection === "object") {
    if (collection.status !== "published" || collection.is_active === false) {
      return null;
    }

    return collection.id;
  }

  const id = Number(collection);

  return Number.isFinite(id) ? id : null;
}

export async function getPromptSlugs(): Promise<string[]> {
  const params = new URLSearchParams({
    fields: "slug",
    limit: "-1",
    sort: "sort,id",
  });

  applyPublishedFilter(params);

  const prompts = await directusRequest<Pick<DirectusPromptItem, "slug">[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return prompts.map((item) => item.slug).filter((slug): slug is string => Boolean(slug));
}

function applyPublishedFilter(params: URLSearchParams) {
  params.set("filter[status][_eq]", "published");
}

function applyPromptFilters(
  params: URLSearchParams,
  filters: Omit<GetPromptsPageDataParams, "collection" | "sort"> & {
    collectionPromptIds?: number[] | null;
  },
) {
  if (filters.collectionPromptIds) {
    if (filters.collectionPromptIds.length === 0) {
      params.set("filter[id][_eq]", "-1");
    } else {
      params.set("filter[id][_in]", filters.collectionPromptIds.join(","));
    }
  }

  if (filters.kind) {
    params.set("filter[content_kind_ref][slug][_eq]", filters.kind);
  }

  if (filters.tag) {
    params.set("filter[tags][prompt_tags_id][slug][_eq]", filters.tag);
  }

  if (filters.network) {
    params.set("filter[neural_network][slug][_eq]", filters.network);
  }

  if (filters.goal) {
    params.set("filter[goal][slug][_eq]", filters.goal);
  }

  if (filters.q) {
    params.set("filter[_or][0][title][_icontains]", filters.q);
    params.set("filter[_or][1][description][_icontains]", filters.q);
  }
}

function getSort(sort: PromptSortOrder): string {
  if (sort === "old") {
    return "published_at,id";
  }

  if (sort === "popular") {
    return "-views_count,-published_at,-id";
  }

  return "-published_at,-id";
}

function normalizePromptItem(
  item: DirectusPromptItem,
  previewEnabled = false,
): PromptItem | null {
  if (
    !item.title ||
    !item.slug ||
    !canReadDirectusItemStatus(item.status, previewEnabled)
  ) {
    return null;
  }

  const images = normalizeImages(item.images || [], item.title);
  const difficultyLabel = item.difficulty
    ? DIFFICULTY_LABELS[item.difficulty] || item.difficulty
    : null;

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    href: `/prompts/${item.slug}`,
    description: item.description || "",
    image: images[0] || null,
    images,
    autoplay: item.autoplay === true,
    aiEnabled: item.ai_enabled === true,
    isPaid: item.is_paid === true,
    neuralNetwork: normalizeNetwork(item.neural_network),
    contentKind: normalizePromptContentKind(item),
    format: getPromptFormatLabel(item),
    formatRef: normalizeTaxonomy(item.format_ref),
    difficulty: item.difficulty,
    difficultyLabel,
    goal: normalizeTaxonomy(item.goal),
    types: normalizeTypes(item.types || []),
    tags: normalizeTags(item.tags || []),
    author: normalizeAuthor(item.author),
    publishedAt: item.published_at,
    updatedAt: item.updated_at,
    viewsCount: item.views_count || 0,
    seo: normalizeDirectusSeo(item, item.title, item.description || ""),
  };
}

function normalizePromptCollection(
  item: DirectusPromptCollection,
  counts: Map<number, number>,
): PromptCollectionItem | null {
  if (
    !item.title ||
    !item.slug ||
    item.status !== "published" ||
    item.is_active === false
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description || null,
    href: `/prompts-menu/collection-${item.slug}`,
    cover: normalizeImage(item.cover, item.title),
    count: counts.get(item.id) || 0,
    publishedAt: item.published_at,
    seoNoindex: Boolean(item.seo_noindex),
  };
}

function normalizePromptContentKind(item: DirectusPromptItem): PromptTaxonomy | null {
  const relation = normalizeTaxonomy(item.content_kind_ref);

  if (relation) {
    return relation;
  }

  if (!item.content_kind) {
    return null;
  }

  return {
    description: "",
    id:
      typeof item.content_kind_ref === "number"
        ? item.content_kind_ref
        : 0,
    slug: item.content_kind,
    title: PROMPT_CONTENT_KIND_LABELS[item.content_kind] || item.content_kind,
  };
}

function getPromptFormatLabel(item: DirectusPromptItem): string | null {
  if (item.format_ref && typeof item.format_ref === "object") {
    return item.format_ref.code || item.format_ref.title || item.format;
  }

  return item.format;
}

function normalizePromptDetail(
  item: DirectusPromptItem | null,
  previewEnabled = false,
): PromptDetail | null {
  if (!item) {
    return null;
  }

  const promptItem = normalizePromptItem(item, previewEnabled);

  if (!promptItem) {
    return null;
  }

  const contentBlocks = normalizeContentBlocks(item.content_blocks || []);
  const promptText =
    item.prompt ||
    contentBlocks.find((block) => block.type === "html")?.content ||
    promptItem.description;

  return {
    ...promptItem,
    promptText,
    contentBlocks,
  };
}

function normalizeContentBlocks(blocks: DirectusContentBlock[]): PromptContentBlock[] {
  return blocks
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentBlock)
    .filter((block): block is PromptContentBlock => block !== null);
}

function normalizeContentBlock(
  block: DirectusContentBlock,
): PromptContentBlock | null {
  if (block.collection === "content_html") {
    return normalizeHtmlBlock(block.id, block.item);
  }

  if (block.collection === "content_text") {
    return normalizeTextBlock(block.id, block.item);
  }

  if (block.collection === "content_quote") {
    return normalizeQuoteBlock(block.id, block.item);
  }

  if (block.collection === "content_list") {
    return normalizeListBlock(block.id, block.item);
  }

  if (block.collection === "content_image") {
    return normalizeImageBlock(block.id, block.item);
  }

  if (block.collection === "content_video") {
    return normalizeVideoBlock(block.id, block.item);
  }

  if (block.collection === "content_cta") {
    return normalizeCtaBlock(block.id, block.item);
  }

  if (block.collection === "content_cards") {
    return normalizeCardsBlock(block.id, block.item);
  }

  if (block.collection === "content_steps") {
    return normalizeStepsContentBlock(block.id, block.item);
  }

  return null;
}

function normalizeHtmlBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const html = item as DirectusContentHtml;

  if (!html.content) {
    return null;
  }

  return {
    id,
    type: "html",
    title: html.title,
    content: html.content,
  };
}

function normalizeTextBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const text = item as DirectusContentText;

  if (!text.content) {
    return null;
  }

  return {
    id,
    type: "text",
    title: text.title,
    content: text.content,
  };
}

function normalizeQuoteBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const quote = item as DirectusContentQuote;

  if (!quote.text) {
    return null;
  }

  return {
    id,
    type: "quote",
    title: quote.title,
    text: quote.text,
    author: quote.author,
  };
}

function normalizeListBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const list = item as DirectusContentList;
  const items = (list.items || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentListItem)
    .filter(
      (listItem): listItem is PromptContentListItem => listItem !== null,
    );

  if (items.length === 0) {
    return null;
  }

  return {
    id,
    type: "list",
    title: list.title,
    items,
  };
}

function normalizeImageBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const imageBlock = item as DirectusContentImage;
  const image = normalizeImage(imageBlock.image, imageBlock.title || "Изображение");

  if (!image) {
    return null;
  }

  return {
    id,
    type: "image",
    title: imageBlock.title,
    caption: imageBlock.caption,
    image,
  };
}

function normalizeVideoBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const videoBlock = item as DirectusContentVideo;
  const video = normalizeImage(videoBlock.video, videoBlock.title || "Видео");

  if (!video && !videoBlock.video_url) {
    return null;
  }

  return {
    id,
    type: "video",
    title: videoBlock.title,
    caption: videoBlock.caption,
    video,
    videoUrl: videoBlock.video_url,
  };
}

function normalizeCtaBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const cta = item as DirectusContentCta;

  if (!cta.title || !cta.description) {
    return null;
  }

  return {
    id,
    type: "cta",
    title: cta.title,
    description: cta.description,
    buttons: normalizeContentButtons(cta.buttons || []),
  };
}

function normalizeCardsBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const cardsBlock = item as DirectusContentCards;
  const cards = (cardsBlock.cards || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentCard)
    .filter((card): card is PromptContentCard => card !== null);

  if (cards.length === 0) {
    return null;
  }

  return {
    id,
    type: "cards",
    title: cardsBlock.title,
    cards,
  };
}

function normalizeStepsContentBlock(
  id: number,
  item: DirectusContentBlock["item"],
): PromptContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const stepsBlock = item as DirectusContentSteps;
  const steps = (stepsBlock.steps || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentStep)
    .filter((step): step is PromptContentStep => step !== null);

  if (steps.length === 0) {
    return null;
  }

  return {
    id,
    type: "steps",
    title: stepsBlock.title,
    steps,
  };
}

function normalizeContentListItem(
  item: DirectusContentListItem,
): PromptContentListItem | null {
  if (!item.title && !item.description) {
    return null;
  }

  return {
    id: item.id,
    title: item.title || "",
    description: item.description || "",
  };
}

function normalizeContentCard(item: DirectusContentCard): PromptContentCard | null {
  if (!item.title && !item.description) {
    return null;
  }

  return {
    id: item.id,
    title: item.title || "",
    description: item.description || "",
    href: item.link,
    image: normalizeImage(item.image, item.title || "Карточка"),
  };
}

function normalizeContentStep(item: DirectusContentStep): PromptContentStep | null {
  if (item.is_active === false || (!item.title && !item.description)) {
    return null;
  }

  return {
    id: item.id,
    title: item.title || "",
    description: item.description || "",
  };
}

function normalizeContentButtons(
  buttons: DirectusContentButtonJunction[],
): PromptContentButton[] {
  return buttons
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((junction) => junction.hero_buttons_id)
    .filter(
      (button): button is DirectusContentButton =>
        Boolean(button) && typeof button === "object",
    )
    .filter((button) => button.is_active !== false && Boolean(button.label && button.url))
    .map((button) => ({
      id: button.id,
      label: button.label || "",
      href: button.url || "#",
      target: button.target || "_self",
      variant: button.variant || "primary",
    }));
}

function normalizeTypes(types: DirectusPromptTypeJunction[]): PromptTaxonomy[] {
  return types
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((type) => type.prompt_types_id)
    .map(normalizeTaxonomy)
    .filter(isTaxonomy);
}

function normalizeTags(tags: DirectusPromptTagJunction[]): PromptTaxonomy[] {
  const unique = new Map<string, PromptTaxonomy>();

  tags
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((tag) => tag.prompt_tags_id)
    .map(normalizeTaxonomy)
    .filter(isTaxonomy)
    .forEach((tag) => unique.set(tag.slug, tag));

  return [...unique.values()];
}

function normalizeTaxonomy(
  item: DirectusTaxonomy | number | null,
): PromptTaxonomy | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  if (!item.title || !item.slug) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    description: item.description || "",
    isFilterable: item.is_filterable === true,
    seoNoindex: Boolean(item.seo_noindex),
  };
}

function normalizeNetwork(
  item: DirectusNeuralNetwork | number | null,
): PromptTaxonomy | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  if (!item.name || !item.slug) {
    return null;
  }

  return {
    id: item.id,
    title: item.name,
    slug: item.slug,
    description: item.description || "",
    seoNoindex: Boolean(item.seo_noindex),
  };
}

function isTaxonomy(item: PromptTaxonomy | null): item is PromptTaxonomy {
  return item !== null;
}

function isPromptItem(item: PromptItem | null): item is PromptItem {
  return item !== null;
}

function isPromptCollection(
  item: PromptCollectionItem | null,
): item is PromptCollectionItem {
  return item !== null;
}

function normalizeAuthor(author: DirectusAuthor | string | null): PromptAuthor | null {
  if (!author || typeof author !== "object") {
    return null;
  }

  const name = [author.first_name, author.last_name].filter(Boolean).join(" ");

  if (!name) {
    return null;
  }

  return {
    id: author.id,
    name,
    jobTitle: author.title || null,
    avatar: normalizeImage(author.avatar, name),
  };
}

function normalizeImages(
  images: DirectusPromptImageJunction[],
  fallbackTitle: string,
): PromptImage[] {
  return images
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((image) => normalizeImage(image.directus_files_id, fallbackTitle))
    .filter((image): image is PromptImage => image !== null);
}

function normalizeImage(
  image: DirectusFile | string | null,
  fallbackTitle: string,
): PromptImage | null {
  if (!image) {
    return null;
  }

  const file =
    typeof image === "string"
      ? {
          id: image,
          title: fallbackTitle,
          type: null,
          width: null,
          height: null,
        }
      : image;

  return {
    id: file.id,
    title: file.title || fallbackTitle,
    url: buildDirectusAssetUrl(file.id, { type: file.type }),
    type: file.type,
    width: file.width,
    height: file.height,
  };
}
