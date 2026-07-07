import type {
  PromptAuthor,
  PromptContentBlock,
  PromptContentButton,
  PromptContentCard,
  PromptContentListItem,
  PromptContentStep,
  PromptDetail,
  PromptDetailPageData,
  PromptImage,
  PromptItem,
  PromptsPageData,
  PromptSortOrder,
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
};

type DirectusNeuralNetwork = {
  id: number;
  sort: number | null;
  name: string | null;
  slug: string | null;
  description: string | null;
  is_active: boolean | null;
};

type DirectusAuthor = {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

const PROMPT_FIELDS = [
  "id",
  "sort",
  "status",
  "title",
  "slug",
  "description",
  "format",
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
  "types.sort",
  "types.prompt_types_id.id",
  "types.prompt_types_id.sort",
  "types.prompt_types_id.title",
  "types.prompt_types_id.slug",
  "types.prompt_types_id.is_active",
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
  "is_active",
].join(",");

const NETWORK_FIELDS = [
  "id",
  "sort",
  "name",
  "slug",
  "description",
  "is_active",
].join(",");

type PromptDetailPageDataWithBlocks = PromptDetailPageData & {
  blocks: PageBlock[];
};

const PAGE_SIZE = 30;

export type GetPromptsPageDataParams = {
  goal?: string | null;
  network?: string | null;
  page?: number;
  q?: string | null;
  sort?: PromptSortOrder;
  tag?: string | null;
  type?: string | null;
};

export async function getPromptsPageData({
  goal,
  network,
  page = 1,
  q,
  sort = "fresh",
  tag,
  type,
}: GetPromptsPageDataParams = {}): Promise<PromptsPageData> {
  const requestedLimit = getListLimit(page);
  const promptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: String(requestedLimit + 1),
    sort: getSort(sort),
  });

  applyPublishedFilter(promptsParams);
  applyPromptFilters(promptsParams, { goal, network, q, tag, type });

  const sidebarPromptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: "100",
    sort: "-views_count,-published_at,-id",
  });
  const totalParams = new URLSearchParams();
  const goalCountsParams = new URLSearchParams();

  totalParams.set("aggregate[count]", "id");
  goalCountsParams.set("aggregate[count]", "id");
  goalCountsParams.set("groupBy[]", "goal");
  applyPublishedFilter(sidebarPromptsParams);
  applyPublishedFilter(totalParams);
  applyPublishedFilter(goalCountsParams);
  applyPromptFilters(totalParams, { goal, network, q, tag, type });

  const [
    prompts,
    sidebarPrompts,
    totalRows,
    goalCountRows,
    types,
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
      directusRequest<DirectusTaxonomy[]>(
        `/items/prompt_types?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusTaxonomy[]>(
        `/items/prompt_tags?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusTaxonomy[]>(
        `/items/prompt_goals?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusNeuralNetwork[]>(
        `/items/neural_networks?filter[is_active][_eq]=true&sort=sort&fields=${NETWORK_FIELDS}`,
        { next: { revalidate: 60 } },
      ),
    ]);

  const normalizedPrompts = prompts.map(normalizePromptItem).filter(isPromptItem);
  const goalCounts = normalizeGoalCounts(goalCountRows);

  return {
    hasMore: normalizedPrompts.length > requestedLimit,
    prompts: normalizedPrompts.slice(0, requestedLimit),
    sidebarPrompts: sidebarPrompts.map(normalizePromptItem).filter(isPromptItem),
    totalCount: normalizeAggregateCount(totalRows),
    types: types.map(normalizeTaxonomy).filter(isTaxonomy),
    tags: tags.map(normalizeTaxonomy).filter(isTaxonomy),
    goals: goals
      .map((item) => normalizeTaxonomyWithCount(item, goalCounts))
      .filter(isTaxonomy),
    neuralNetworks: neuralNetworks.map(normalizeNetwork).filter(isTaxonomy),
  };
}

function normalizeAggregateCount(rows: DirectusAggregateCount[]): number {
  const count = Number(rows[0]?.count?.id || 0);

  return Number.isFinite(count) ? count : 0;
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

export async function getPromptBySlug(slug: string): Promise<PromptDetail | null> {
  const params = new URLSearchParams({
    fields: PROMPT_DETAIL_FIELDS,
    limit: "1",
  });

  applyPublishedFilter(params);
  params.set("filter[slug][_eq]", slug);

  const prompts = await directusRequest<DirectusPromptItem[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizePromptDetail(prompts[0] || null);
}

export async function getRelatedPrompts(
  current: PromptItem,
  limit = 6,
): Promise<PromptItem[]> {
  const params = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: String(limit),
    sort: "-views_count,-published_at,-id",
  });

  applyPublishedFilter(params);
  params.set("filter[id][_neq]", String(current.id));

  if (current.types[0]) {
    params.set("filter[types][prompt_types_id][slug][_eq]", current.types[0].slug);
  } else if (current.goal) {
    params.set("filter[goal][slug][_eq]", current.goal.slug);
  }

  const prompts = await directusRequest<DirectusPromptItem[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return prompts.map(normalizePromptItem).filter(isPromptItem);
}

export async function getPromptDetailPageData(
  slug: string,
): Promise<PromptDetailPageDataWithBlocks | null> {
  const item = await getPromptBySlug(slug);

  if (!item) {
    return null;
  }

  const [initialRelated, blocks] = await Promise.all([
    getRelatedPrompts(item),
    getPromptPageBlocksBySlug(slug),
  ]);
  let related = initialRelated;

  if (related.length < 3) {
    related = await getFallbackRelatedPrompts(item.id, 6);
  }

  return {
    blocks,
    item,
    related,
  };
}

async function getPromptPageBlocksBySlug(slug: string): Promise<PageBlock[]> {
  const params = new URLSearchParams({
    fields: PAGE_BLOCK_FIELDS,
    limit: "1",
  });

  applyPublishedFilter(params);
  params.set("filter[slug][_eq]", slug);

  const prompts = await directusRequest<{ blocks?: DirectusPageBlock[] }[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizePageBlocks(prompts[0]?.blocks || []);
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

async function getFallbackRelatedPrompts(
  currentId: number,
  limit: number,
): Promise<PromptItem[]> {
  const params = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: String(limit),
    sort: "-views_count,-published_at,-id",
  });

  applyPublishedFilter(params);
  params.set("filter[id][_neq]", String(currentId));

  const prompts = await directusRequest<DirectusPromptItem[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return prompts.map(normalizePromptItem).filter(isPromptItem);
}

function applyPublishedFilter(params: URLSearchParams) {
  params.set("filter[status][_eq]", "published");
}

function applyPromptFilters(
  params: URLSearchParams,
  filters: Omit<GetPromptsPageDataParams, "sort">,
) {
  if (filters.type) {
    params.set("filter[types][prompt_types_id][slug][_eq]", filters.type);
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

function normalizePromptItem(item: DirectusPromptItem): PromptItem | null {
  if (!item.title || !item.slug || item.status !== "published") {
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
    neuralNetwork: normalizeNetwork(item.neural_network),
    format: item.format,
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

function normalizePromptDetail(
  item: DirectusPromptItem | null,
): PromptDetail | null {
  if (!item) {
    return null;
  }

  const promptItem = normalizePromptItem(item);

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
  };
}

function isTaxonomy(item: PromptTaxonomy | null): item is PromptTaxonomy {
  return item !== null;
}

function isPromptItem(item: PromptItem | null): item is PromptItem {
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
