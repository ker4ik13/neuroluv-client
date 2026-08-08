import type {
  NewsContentBlock,
  NewsContentButton,
  NewsContentCard,
  NewsContentListItem,
  NewsContentStep,
  NewsAuthor,
  NewsDetail,
  NewsDetailPageData,
  NewsImage,
  NewsItem,
  NewsPageData,
  NewsSortOrder,
  NewsTaxonomy,
} from "@/entities/news";
import type { PageBlock } from "@/entities/page";
import { directusRequest } from "@/shared/api/directus/client";
import {
  normalizeDirectusContentButtonIcon,
  type DirectusContentButtonIcon,
} from "@/shared/api/directus/content-button-icon";
import {
  getDirectusPageBlocksBySlug,
  hydratePageBlocks,
  normalizePageBlocks,
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
};

type DirectusAuthor = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  avatar: DirectusFile | string | null;
};

type DirectusNewsTagJunction = {
  sort: number | null;
  news_tags_id: DirectusTaxonomy | number | null;
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
  is_warning?: boolean | null;
  buttons?: DirectusContentButtonJunction[];
};

type DirectusContentButton = {
  id: number;
  label: string | null;
  url: string | null;
  target: "_self" | "_blank" | null;
  variant: "primary" | "secondary" | "outline" | null;
  icon?: DirectusContentButtonIcon | null;
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

type DirectusMiniCta = DirectusContentCta;

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

type DirectusNewsItem = {
  id: number;
  sort: number | null;
  status: "published" | "draft" | "archived" | string | null;
  title: string | null;
  slug: string | null;
  description: string | null;
  mini_description: string | null;
  image: DirectusFile | string | null;
  published_at: string | null;
  updated_at: string | null;
  readtime: number | null;
  author: DirectusAuthor | string | null;
  topic: DirectusTaxonomy | number | null;
  mini_cta: DirectusMiniCta | number | null;
  tags?: DirectusNewsTagJunction[];
  content_blocks?: DirectusContentBlock[];
} & DirectusSeoFields;

const NEWS_CARD_FIELDS = [
  "id",
  "sort",
  "status",
  "title",
  "slug",
  "description",
  "mini_description",
  "published_at",
  "updated_at",
  "readtime",
  "image.id",
  "image.title",
  "image.type",
  "image.width",
  "image.height",
  "topic.id",
  "topic.sort",
  "topic.title",
  "topic.slug",
  "topic.description",
  "topic.is_active",
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
  "tags.news_tags_id.id",
  "tags.news_tags_id.sort",
  "tags.news_tags_id.title",
  "tags.news_tags_id.slug",
  "tags.news_tags_id.description",
  "tags.news_tags_id.is_active",
].join(",");

const NEWS_METADATA_FIELDS = [
  "id",
  "status",
  "title",
  "slug",
  "description",
  "mini_description",
  "published_at",
  "updated_at",
  "image.id",
  "image.title",
  "image.type",
  "image.width",
  "image.height",
  "author.id",
  "author.first_name",
  "author.last_name",
  "author.title",
  DIRECTUS_SEO_FIELDS,
].join(",");

const TAXONOMY_FIELDS = ["id", "sort", "title", "slug", "description", "is_active"].join(
  ",",
);

const NEWS_DETAIL_FIELDS = [
  NEWS_CARD_FIELDS,
  DIRECTUS_SEO_FIELDS,
  "mini_cta.id",
  "mini_cta.is_active",
  "mini_cta.title",
  "mini_cta.description",
  "mini_cta.buttons.sort",
  "mini_cta.buttons.hero_buttons_id.id",
  "mini_cta.buttons.hero_buttons_id.label",
  "mini_cta.buttons.hero_buttons_id.url",
  "mini_cta.buttons.hero_buttons_id.target",
  "mini_cta.buttons.hero_buttons_id.variant",
  "mini_cta.buttons.hero_buttons_id.icon.title",
  "mini_cta.buttons.hero_buttons_id.icon.code",
  "mini_cta.buttons.hero_buttons_id.icon.library",
  "mini_cta.buttons.hero_buttons_id.icon.is_active",
  "mini_cta.buttons.hero_buttons_id.is_active",
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
  "content_blocks.item:content_cta.buttons.hero_buttons_id.icon.title",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.icon.code",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.icon.library",
  "content_blocks.item:content_cta.buttons.hero_buttons_id.icon.is_active",
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
  "content_blocks.item:content_steps.steps.is_warning",
  "content_blocks.item:content_steps.steps.buttons.sort",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.id",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.label",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.url",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.target",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.variant",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.icon.title",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.icon.code",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.icon.library",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.icon.is_active",
  "content_blocks.item:content_steps.steps.buttons.hero_buttons_id.is_active",
].join(",");

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const PAGE_SIZE = 30;
const YANDEX_NEWS_FRESHNESS_DAYS = 8;

type NewsDetailPageDataWithBlocks = NewsDetailPageData & {
  blocks: PageBlock[];
};

export type GetNewsPageDataParams = {
  includeFacets?: boolean;
  page?: number;
  q?: string | null;
  sort?: NewsSortOrder;
  tag?: string | null;
  topic?: string | null;
};

export async function getNewsPageData({
  includeFacets,
  page = 1,
  q,
  sort = "fresh",
  tag,
  topic,
}: GetNewsPageDataParams = {}): Promise<NewsPageData> {
  const activeTag = topic ? null : tag;
  const normalizedPage = Math.max(1, Math.trunc(page));
  const newsParams = new URLSearchParams({
    fields: NEWS_CARD_FIELDS,
    limit: String(PAGE_SIZE + 1),
    offset: String((normalizedPage - 1) * PAGE_SIZE),
    sort: sort === "old" ? "published_at,id" : "-published_at,-id",
  });

  newsParams.set("filter[status][_eq]", "published");

  if (topic) {
    newsParams.set("filter[topic][slug][_eq]", topic);
  }

  if (activeTag) {
    newsParams.set("filter[tags][news_tags_id][slug][_eq]", activeTag);
  }

  if (q) {
    newsParams.set("filter[_or][0][title][_icontains]", q);
    newsParams.set("filter[_or][1][description][_icontains]", q);
    newsParams.set("filter[_or][2][mini_description][_icontains]", q);
  }

  const sidebarNewsParams = new URLSearchParams({
    fields: NEWS_CARD_FIELDS,
    limit: "12",
    sort: "-published_at,-id",
  });

  sidebarNewsParams.set("filter[status][_eq]", "published");

  const shouldLoadFacets = includeFacets ?? normalizedPage === 1;
  const [news, sidebarNews, topics, tags] = await Promise.all([
    directusRequest<DirectusNewsItem[]>(
      `/items/news?${newsParams.toString()}`,
      { next: { revalidate: 60 } },
    ),
    shouldLoadFacets
      ? directusRequest<DirectusNewsItem[]>(
          `/items/news?${sidebarNewsParams.toString()}`,
          { next: { revalidate: 60 } },
        )
      : Promise.resolve([]),
    shouldLoadFacets
      ? directusRequest<DirectusTaxonomy[]>(
          `/items/news_topics?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
          { next: { revalidate: 60 } },
        )
      : Promise.resolve([]),
    shouldLoadFacets
      ? directusRequest<DirectusTaxonomy[]>(
          `/items/news_tags?filter[is_active][_eq]=true&sort=sort&fields=${TAXONOMY_FIELDS}`,
          { next: { revalidate: 60 } },
        )
      : Promise.resolve([]),
  ]);

  const normalizedNews = news.map((item) => normalizeNewsItem(item)).filter(isNewsItem);

  return {
    hasMore: normalizedNews.length > PAGE_SIZE,
    news: normalizedNews.slice(0, PAGE_SIZE),
    sidebarNews: sidebarNews.map((item) => normalizeNewsItem(item)).filter(isNewsItem),
    topics: topics.map(normalizeTaxonomy).filter(isTaxonomy),
    tags: tags.map(normalizeTaxonomy).filter(isTaxonomy),
  };
}

export async function getNewsMetadataBySlug(
  slug: string,
): Promise<NewsItem | null> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: NEWS_METADATA_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    params.set("filter[status][_eq]", "published");
  }

  params.set("filter[slug][_eq]", slug);

  const rows = await directusRequest<DirectusNewsItem[]>(
    `/items/news?${params.toString()}`,
    preview.requestOptions,
  );
  const item = rows[0];

  return item ? normalizeNewsItem(item, preview.enabled) : null;
}

export async function getNewsBySlug(slug: string): Promise<NewsDetail | null> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: NEWS_DETAIL_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    params.set("filter[status][_eq]", "published");
  }

  params.set("filter[slug][_eq]", slug);

  const news = await directusRequest<DirectusNewsItem[]>(
    `/items/news?${params.toString()}`,
    preview.requestOptions,
  );

  return normalizeNewsDetail(news[0] || null, preview.enabled);
}

export async function getRecentNewsForYandexFeed(
  referenceDate = new Date(),
): Promise<NewsDetail[]> {
  const freshnessBoundary = new Date(
    referenceDate.getTime() - YANDEX_NEWS_FRESHNESS_DAYS * 24 * 60 * 60 * 1_000,
  );
  const params = new URLSearchParams({
    fields: NEWS_DETAIL_FIELDS,
    limit: "-1",
    sort: "-published_at,-id",
  });

  params.set("filter[status][_eq]", "published");
  params.set("filter[published_at][_gte]", freshnessBoundary.toISOString());
  params.set("filter[published_at][_lte]", referenceDate.toISOString());

  const news = await directusRequest<DirectusNewsItem[]>(
    `/items/news?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return news
    .map((item) => normalizeNewsDetail(item))
    .filter((item): item is NewsDetail => item !== null);
}

export async function getRelatedNews(
  currentId: number,
  limit = 6,
): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    fields: NEWS_CARD_FIELDS,
    limit: String(limit),
    sort: "-published_at,-id",
  });

  params.set("filter[status][_eq]", "published");
  params.set("filter[id][_neq]", String(currentId));

  const news = await directusRequest<DirectusNewsItem[]>(
    `/items/news?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return news.map((item) => normalizeNewsItem(item)).filter(isNewsItem);
}

export async function getNewsDetailPageData(
  slug: string,
): Promise<NewsDetailPageDataWithBlocks | null> {
  const item = await getNewsBySlug(slug);

  if (!item) {
    return null;
  }

  const [related, blocks] = await Promise.all([
    getRelatedNews(item.id),
    getNewsPageBlocksBySlug(slug),
  ]);

  return {
    blocks,
    item,
    related,
  };
}

async function getNewsPageBlocksBySlug(slug: string): Promise<PageBlock[]> {
  const blocks = await getDirectusPageBlocksBySlug("news", slug);

  return hydratePageBlocks(normalizePageBlocks(blocks));
}

export async function getNewsSlugs(): Promise<string[]> {
  const params = new URLSearchParams({
    fields: "slug",
    limit: "-1",
    sort: "sort,id",
  });

  params.set("filter[status][_eq]", "published");

  const news = await directusRequest<Pick<DirectusNewsItem, "slug">[]>(
    `/items/news?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return news.map((item) => item.slug).filter((slug): slug is string => Boolean(slug));
}

function normalizeNewsItem(
  item: DirectusNewsItem,
  previewEnabled = false,
): NewsItem | null {
  if (
    !item.title ||
    !item.slug ||
    !canReadDirectusItemStatus(item.status, previewEnabled)
  ) {
    return null;
  }

  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    href: `/news/${item.slug}`,
    description: item.description || "",
    miniDescription: item.mini_description || item.description || "",
    image: normalizeImage(item.image, "Новость"),
    publishedAt: item.published_at,
    publishedAtLabel: formatDate(item.published_at),
    updatedAt: item.updated_at,
    readTime: item.readtime,
    viewsCount: null,
    author: normalizeAuthor(item.author),
    topic: normalizeTaxonomy(item.topic),
    tags: normalizeTags(item.tags || []),
    seo: normalizeDirectusSeo(item, item.title, item.description || ""),
  };
}

function normalizeNewsDetail(
  item: DirectusNewsItem | null,
  previewEnabled = false,
): NewsDetail | null {
  if (!item) {
    return null;
  }

  const newsItem = normalizeNewsItem(item, previewEnabled);

  if (!newsItem) {
    return null;
  }

  return {
    ...newsItem,
    contentBlocks: normalizeContentBlocks(item.content_blocks || []),
    miniCta: normalizeMiniCta(item.mini_cta),
  };
}

function isNewsItem(item: NewsItem | null): item is NewsItem {
  return item !== null;
}

function normalizeContentBlocks(blocks: DirectusContentBlock[]): NewsContentBlock[] {
  return blocks
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentBlock)
    .filter((block): block is NewsContentBlock => block !== null);
}

function normalizeContentBlock(block: DirectusContentBlock): NewsContentBlock | null {
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
): NewsContentBlock | null {
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
): NewsContentBlock | null {
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
): NewsContentBlock | null {
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
): NewsContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const list = item as DirectusContentList;
  const items = (list.items || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentListItem)
    .filter(
      (listItem): listItem is NewsContentListItem => listItem !== null,
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
): NewsContentBlock | null {
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
): NewsContentBlock | null {
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
): NewsContentBlock | null {
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

function normalizeMiniCta(
  item: DirectusMiniCta | number | null,
): Extract<NewsContentBlock, { type: "cta" }> | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const normalized = normalizeCtaBlock(item.id, item);

  return normalized?.type === "cta" ? normalized : null;
}

function normalizeCardsBlock(
  id: number,
  item: DirectusContentBlock["item"],
): NewsContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const cardsBlock = item as DirectusContentCards;
  const cards = (cardsBlock.cards || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentCard)
    .filter((card): card is NewsContentCard => card !== null);

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
): NewsContentBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  const stepsBlock = item as DirectusContentSteps;
  const steps = (stepsBlock.steps || [])
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeContentStep)
    .filter((step): step is NewsContentStep => step !== null);

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
): NewsContentListItem | null {
  if (!item.title && !item.description) {
    return null;
  }

  return {
    id: item.id,
    title: item.title || "",
    description: item.description || "",
  };
}

function normalizeContentCard(item: DirectusContentCard): NewsContentCard | null {
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

function normalizeContentStep(item: DirectusContentStep): NewsContentStep | null {
  if (item.is_active === false || (!item.title && !item.description)) {
    return null;
  }

  return {
    id: item.id,
    title: item.title || "",
    description: item.description || "",
    isWarning: item.is_warning === true,
    buttons: normalizeContentButtons(item.buttons || []),
  };
}

function normalizeContentButtons(
  buttons: DirectusContentButtonJunction[],
): NewsContentButton[] {
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
      icon: normalizeDirectusContentButtonIcon(button.icon),
    }));
}

function normalizeTags(tags: DirectusNewsTagJunction[]): NewsTaxonomy[] {
  return tags
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((tag) => tag.news_tags_id)
    .map(normalizeTaxonomy)
    .filter(isTaxonomy);
}

function normalizeTaxonomy(item: DirectusTaxonomy | number | null): NewsTaxonomy | null {
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

function isTaxonomy(item: NewsTaxonomy | null): item is NewsTaxonomy {
  return item !== null;
}

function normalizeAuthor(author: DirectusAuthor | string | null): NewsAuthor | null {
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

function normalizeImage(
  image: DirectusFile | string | null,
  fallbackTitle: string,
): NewsImage | null {
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

function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  return dateFormatter.format(new Date(value));
}
