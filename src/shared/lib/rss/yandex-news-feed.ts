import type { NewsContentBlock, NewsDetail } from "@/entities/news";

type BuildYandexNewsFeedOptions = {
  generatedAt?: Date;
  items: NewsDetail[];
  siteUrl: string;
};

const CHANNEL_DESCRIPTION =
  "Новости об искусственном интеллекте, нейросетях и создании контента";
const CHANNEL_TITLE = "Нейролюб: Новости";
const MAX_ARTICLE_URL_LENGTH = 243;
const MAX_FEED_SIZE_BYTES = 9_900_000;
const MAX_TITLE_LENGTH = 200;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  copy: "©",
  deg: "°",
  divide: "÷",
  emsp: " ",
  ensp: " ",
  euro: "€",
  gt: ">",
  hellip: "…",
  laquo: "«",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  middot: "·",
  minus: "−",
  nbsp: " ",
  ndash: "–",
  pound: "£",
  quot: '"',
  raquo: "»",
  rdquo: "”",
  reg: "®",
  rsquo: "’",
  thinsp: " ",
  times: "×",
  trade: "™",
  yen: "¥",
};

export function buildYandexNewsFeed({
  generatedAt = new Date(),
  items,
  siteUrl,
}: BuildYandexNewsFeedOptions): string {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const feedItems = items
    .map((item) => buildFeedItem(item, normalizedSiteUrl))
    .filter((item): item is string => item !== null);
  const channelHeader = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:yandex="http://news.yandex.ru" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(CHANNEL_TITLE)}</title>`,
    `    <link>${escapeXml(normalizedSiteUrl)}</link>`,
    `    <description>${escapeXml(CHANNEL_DESCRIPTION)}</description>`,
    "    <language>ru</language>",
    `    <lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate>`,
  ];
  const channelFooter = [
    "  </channel>",
    "</rss>",
    "",
  ];
  const encoder = new TextEncoder();
  const selectedItems: string[] = [];
  let feedSize = encoder.encode(
    [...channelHeader, ...channelFooter].join("\n"),
  ).byteLength;

  feedItems.forEach((item) => {
    const itemSize = encoder.encode(`${item}\n`).byteLength;

    if (feedSize + itemSize <= MAX_FEED_SIZE_BYTES) {
      selectedItems.push(item);
      feedSize += itemSize;
    }
  });

  return [...channelHeader, ...selectedItems, ...channelFooter].join("\n");
}

function buildFeedItem(item: NewsDetail, siteUrl: string): string | null {
  const title = toPlainText(item.title);
  const publicationDate = parsePublicationDate(item.publishedAt);
  const articleUrl = buildArticleUrl(item.href, siteUrl);
  const fullText = buildArticleText(item);

  if (!isEligibleTitle(title) || !publicationDate || !articleUrl || !fullText) {
    return null;
  }

  const description = toPlainText(item.description);
  const lines = [
    "    <item>",
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(articleUrl)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(articleUrl)}</guid>`,
  ];

  if (description) {
    lines.push(`      <description>${escapeXml(description)}</description>`);
  }

  if (item.author?.name) {
    lines.push(
      `      <author>${escapeXml(toPlainText(item.author.name))}</author>`,
    );
  }

  if (item.topic?.title) {
    lines.push(
      `      <category>${escapeXml(toPlainText(item.topic.title))}</category>`,
    );
  }

  lines.push(
    `      <pubDate>${publicationDate.toUTCString()}</pubDate>`,
    "      <yandex:genre>article</yandex:genre>",
    `      <yandex:full-text>${escapeXml(fullText)}</yandex:full-text>`,
    "    </item>",
  );

  return lines.join("\n");
}

function buildArticleText(item: NewsDetail): string {
  const fragments = [
    toPlainText(item.description),
    ...item.contentBlocks.flatMap(getEditorialFragments),
  ];
  const uniqueFragments: string[] = [];

  fragments.forEach((fragment) => {
    if (fragment && uniqueFragments.at(-1) !== fragment) {
      uniqueFragments.push(fragment);
    }
  });

  return uniqueFragments.join("\n\n");
}

function getEditorialFragments(block: NewsContentBlock): string[] {
  if (block.type === "html" || block.type === "text") {
    return [toPlainText(block.title), toPlainText(block.content)].filter(
      Boolean,
    );
  }

  if (block.type === "quote") {
    return [toPlainText(block.title), toPlainText(block.text)].filter(Boolean);
  }

  if (block.type === "list") {
    return [
      toPlainText(block.title),
      ...block.items.flatMap((item) => [
        toPlainText(item.title),
        toPlainText(item.description),
      ]),
    ].filter(Boolean);
  }

  if (block.type === "steps") {
    return [
      toPlainText(block.title),
      ...block.steps.flatMap((step) => [
        toPlainText(step.title),
        toPlainText(step.description),
      ]),
    ].filter(Boolean);
  }

  // Yandex forbids photo captions, media links, ads, CTA and related-content
  // blocks inside yandex:full-text.
  return [];
}

function toPlainText(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const withoutMarkup = value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(
      /<\/\s*(address|article|aside|blockquote|div|figcaption|figure|footer|h[1-6]|header|li|main|nav|ol|p|pre|section|table|tr|ul)\s*>/gi,
      "\n",
    )
    .replace(/<\s*li\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(decodeHtmlEntities(withoutMarkup))
    .replace(/\u00a0/g, " ")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        return decodeCodePoint(entity, Number.parseInt(code.slice(2), 16));
      }

      if (code.startsWith("#")) {
        return decodeCodePoint(entity, Number.parseInt(code.slice(1), 10));
      }

      return HTML_ENTITIES[code.toLowerCase()] ?? entity;
    },
  );
}

function decodeCodePoint(fallback: string, codePoint: number): string {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return fallback;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

function isEligibleTitle(title: string): boolean {
  if (
    !title ||
    Array.from(title).length > MAX_TITLE_LENGTH ||
    title.endsWith(".")
  ) {
    return false;
  }

  const letters = Array.from(title).filter((character) =>
    /\p{L}/u.test(character),
  );

  return !(
    letters.length > 1 &&
    letters.join("") === letters.join("").toLocaleUpperCase("ru-RU")
  );
}

function buildArticleUrl(path: string, siteUrl: string): string | null {
  try {
    const url = new URL(path, `${siteUrl}/`);

    if (
      url.origin !== new URL(siteUrl).origin ||
      !["http:", "https:"].includes(url.protocol) ||
      url.hash ||
      url.href.length > MAX_ARTICLE_URL_LENGTH ||
      !/^[\x00-\x7F]+$/.test(url.href)
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function parsePublicationDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSiteUrl(value: string): string {
  return new URL(value).origin;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
