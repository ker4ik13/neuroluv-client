import type {
  PromptAuthor,
  PromptContentBlock,
  PromptContentListItem,
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
  PAGE_FIELDS,
  normalizePageBlocks,
  type DirectusPageBlock,
} from "@/shared/api/directus/pages";
import { DIRECTUS_URL } from "@/shared/config/directus";

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

type DirectusContentHtml = {
  id: number;
  is_active: boolean | null;
  title: string | null;
  content: string | null;
};

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

type DirectusContentBlock = {
  id: number;
  sort: number | null;
  collection: string | null;
  item:
    | DirectusContentHtml
    | DirectusContentQuote
    | DirectusContentList
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
  tags?: DirectusPromptTagJunction[];
  types?: DirectusPromptTypeJunction[];
  images?: DirectusPromptImageJunction[];
  content_blocks?: DirectusContentBlock[];
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
].join(",");

const PROMPT_DETAIL_FIELDS = [
  PROMPT_FIELDS,
  "content_blocks.id",
  "content_blocks.sort",
  "content_blocks.collection",
  "content_blocks.item:content_html.id",
  "content_blocks.item:content_html.is_active",
  "content_blocks.item:content_html.title",
  "content_blocks.item:content_html.content",
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

export type GetPromptsPageDataParams = {
  goal?: string | null;
  network?: string | null;
  q?: string | null;
  sort?: PromptSortOrder;
  tag?: string | null;
  type?: string | null;
};

export async function getPromptsPageData({
  goal,
  network,
  q,
  sort = "fresh",
  tag,
  type,
}: GetPromptsPageDataParams = {}): Promise<PromptsPageData> {
  const promptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: "100",
    sort: getSort(sort),
  });

  applyPublishedFilter(promptsParams);
  applyPromptFilters(promptsParams, { goal, network, q, tag, type });

  const sidebarPromptsParams = new URLSearchParams({
    fields: PROMPT_FIELDS,
    limit: "100",
    sort: "-views_count,-published_at,-id",
  });

  applyPublishedFilter(sidebarPromptsParams);

  const [prompts, sidebarPrompts, types, tags, goals, neuralNetworks] =
    await Promise.all([
      directusRequest<DirectusPromptItem[]>(
        `/items/prompts?${promptsParams.toString()}`,
        { next: { revalidate: 60 } },
      ),
      directusRequest<DirectusPromptItem[]>(
        `/items/prompts?${sidebarPromptsParams.toString()}`,
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

  return {
    prompts: prompts.map(normalizePromptItem).filter(isPromptItem),
    sidebarPrompts: sidebarPrompts.map(normalizePromptItem).filter(isPromptItem),
    types: types.map(normalizeTaxonomy).filter(isTaxonomy),
    tags: tags.map(normalizeTaxonomy).filter(isTaxonomy),
    goals: goals.map(normalizeTaxonomy).filter(isTaxonomy),
    neuralNetworks: neuralNetworks.map(normalizeNetwork).filter(isTaxonomy),
  };
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
    fields: PAGE_FIELDS,
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
    viewsCount: item.views_count || 0,
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

  if (block.collection === "content_quote") {
    return normalizeQuoteBlock(block.id, block.item);
  }

  if (block.collection === "content_list") {
    return normalizeListBlock(block.id, block.item);
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
    url: `${DIRECTUS_URL}/assets/${file.id}`,
    type: file.type,
    width: file.width,
    height: file.height,
  };
}
