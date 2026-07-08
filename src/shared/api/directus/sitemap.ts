import type { MetadataRoute } from "next";

import { directusRequest } from "@/shared/api/directus/client";
import { SITE_URL } from "@/shared/config/site";

type DirectusSitemapSettings = {
  is_active: boolean | null;
  site_url: string | null;
  sitemap_path: string | null;
  default_change_frequency: MetadataRoute.Sitemap[number]["changeFrequency"] | null;
  default_priority: string | number | null;
  include_images: boolean | null;
};

type DirectusRobotsTxt = {
  is_active: boolean | null;
  content: string | null;
};

type DirectusSitemapRoute = {
  path: string | null;
  change_frequency: MetadataRoute.Sitemap[number]["changeFrequency"] | null;
  priority: string | number | null;
  last_modified: string | null;
  is_active: boolean | null;
};

type DirectusSitemapSource = {
  collection_name: string | null;
  base_path: string | null;
  slug_field: string | null;
  date_field: string | null;
  status_field: string | null;
  status_value: string | null;
  noindex_field: string | null;
  change_frequency: MetadataRoute.Sitemap[number]["changeFrequency"] | null;
  priority: string | number | null;
  is_active: boolean | null;
};

type DirectusSitemapItem = Record<string, string | number | boolean | null>;

type DirectusPromptMenuTaxonomy = {
  id: number;
  is_active: boolean | null;
  seo_noindex: boolean | null;
  slug: string | null;
};

type DirectusPromptMenuTagCount = {
  count?: {
    id?: number | string | null;
  };
  prompt_tags_id?: number | string | DirectusPromptMenuTaxonomy | null;
};

type DirectusPromptMenuCollection = {
  is_active: boolean | null;
  seo_noindex: boolean | null;
  slug: string | null;
  status: string | null;
  updated_at: string | null;
};

type DirectusNoindexPage = {
  seo_noindex: boolean | null;
  slug: string | null;
  status: string | null;
};

type PromptMenuSitemapState = {
  allowedPaths: Set<string>;
  entries: MetadataRoute.Sitemap;
  excludedPaths: Set<string>;
};

type SitemapSettings = {
  defaultChangeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  defaultPriority: number;
  siteUrl: string;
  sitemapPath: string;
};

type RobotsRule = {
  allow?: string | string[];
  crawlDelay?: number;
  disallow?: string | string[];
  userAgent: string | string[];
};

const ALLOWED_SITEMAP_COLLECTIONS = new Set([
  "pages",
  "services",
  "articles",
  "news",
  "prompts",
]);

let cachedRobotsTxtContent: string | null = null;
let cachedRobotsMetadata: MetadataRoute.Robots | null = null;
let cachedSitemapEntries: MetadataRoute.Sitemap | null = null;

export async function getRobotsMetadata(): Promise<MetadataRoute.Robots> {
  try {
    const content = await getRobotsTxtContent();
    const robots = parseRobotsContent(content) || buildFallbackRobotsMetadata(
      await getSitemapSettings(),
    );

    cachedRobotsMetadata = robots;

    return robots;
  } catch (error) {
    if (cachedRobotsMetadata) {
      return cachedRobotsMetadata;
    }

    throw error;
  }
}

export async function getRobotsTxtContent(): Promise<string> {
  const settings = await getSitemapSettings();

  try {
    const robots = await directusRequest<DirectusRobotsTxt>(
      "/items/robots_txt?fields=is_active,content",
      { next: { revalidate: 60 } },
    );

    if (robots.is_active !== false && robots.content) {
      cachedRobotsTxtContent = robots.content;

      return robots.content;
    }
  } catch (error) {
    if (cachedRobotsTxtContent) {
      return cachedRobotsTxtContent;
    }

    throw error;
  }

  cachedRobotsTxtContent = buildFallbackRobots(settings);

  return cachedRobotsTxtContent;
}

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSitemapSettings();

  try {
    const [routes, configuredSources, promptMenuSitemap] = await Promise.all([
      getManualSitemapRoutes(),
      getSitemapSources(),
      getPromptMenuSitemapState(settings),
    ]);
    const sources = ensureRequiredSitemapSources(configuredSources);

    const dynamicEntries = (
      await Promise.all(
        sources
          .filter((source) => source.is_active !== false)
          .filter((source) => isAllowedCollection(source.collection_name))
          .map((source) => getSourceSitemapEntries(source, settings)),
      )
    ).flat();

    const entries = dedupeSitemapEntries([
      ...routes.map((route) => normalizeManualRoute(route, settings)),
      ...dynamicEntries,
      ...promptMenuSitemap.entries,
    ]).filter((entry) =>
      shouldIncludeSitemapEntry(entry, settings, promptMenuSitemap),
    );

    cachedSitemapEntries = entries;

    return entries;
  } catch (error) {
    if (cachedSitemapEntries) {
      return cachedSitemapEntries;
    }

    throw error;
  }
}

function ensureRequiredSitemapSources(
  sources: DirectusSitemapSource[],
): DirectusSitemapSource[] {
  const requiredSources: DirectusSitemapSource[] = [
    {
      base_path: "/",
      change_frequency: null,
      collection_name: "pages",
      date_field: null,
      is_active: true,
      noindex_field: "seo_noindex",
      priority: null,
      slug_field: "slug",
      status_field: "status",
      status_value: "published",
    },
    {
      base_path: "/prompts",
      change_frequency: "weekly",
      collection_name: "prompts",
      date_field: "updated_at",
      is_active: true,
      noindex_field: "seo_noindex",
      priority: 0.7,
      slug_field: "slug",
      status_field: "status",
      status_value: "published",
    },
  ];

  return requiredSources.reduce((result, requiredSource) => {
    if (
      result.some(
        (source) => source.collection_name === requiredSource.collection_name,
      )
    ) {
      return result;
    }

    return [...result, requiredSource];
  }, sources);
}

async function getSitemapSettings(): Promise<SitemapSettings> {
  try {
    const settings = await directusRequest<DirectusSitemapSettings>(
      [
        "/items/sitemap_settings?fields=",
        [
          "is_active",
          "site_url",
          "sitemap_path",
          "default_change_frequency",
          "default_priority",
          "include_images",
        ].join(","),
      ].join(""),
      { next: { revalidate: 60 } },
    );

    if (settings.is_active === false) {
      return getFallbackSettings();
    }

    return {
      defaultChangeFrequency:
        settings.default_change_frequency || getFallbackSettings().defaultChangeFrequency,
      defaultPriority:
        normalizePriority(settings.default_priority) || getFallbackSettings().defaultPriority,
      siteUrl: normalizeSiteUrl(settings.site_url || SITE_URL),
      sitemapPath: normalizePath(settings.sitemap_path || "/sitemap.xml"),
    };
  } catch {
    return getFallbackSettings();
  }
}

async function getManualSitemapRoutes(): Promise<DirectusSitemapRoute[]> {
  return directusRequest<DirectusSitemapRoute[]>(
    [
      "/items/sitemap_routes?",
      new URLSearchParams({
        fields:
          "path,change_frequency,priority,last_modified,is_active",
        limit: "-1",
        sort: "sort,id",
      }).toString(),
    ].join(""),
    { next: { revalidate: 60 } },
  );
}

async function getSitemapSources(): Promise<DirectusSitemapSource[]> {
  return directusRequest<DirectusSitemapSource[]>(
    [
      "/items/sitemap_sources?",
      new URLSearchParams({
        fields: [
          "collection_name",
          "base_path",
          "slug_field",
          "date_field",
          "status_field",
          "status_value",
          "noindex_field",
          "change_frequency",
          "priority",
          "is_active",
        ].join(","),
        filter: JSON.stringify({ is_active: { _eq: true } }),
        limit: "-1",
        sort: "sort,id",
      }).toString(),
    ].join(""),
    { next: { revalidate: 60 } },
  );
}

async function getSourceSitemapEntries(
  source: DirectusSitemapSource,
  settings: SitemapSettings,
): Promise<MetadataRoute.Sitemap> {
  if (!source.collection_name || !source.slug_field) {
    return [];
  }

  const fields = getSourceFields(source);
  const params = new URLSearchParams({
    fields: fields.join(","),
    limit: "-1",
    sort: source.date_field ? `-${source.date_field},id` : "sort,id",
  });

  if (source.status_field && source.status_value) {
    params.set(`filter[${source.status_field}][_eq]`, source.status_value);
  }

  const items = await directusRequest<DirectusSitemapItem[]>(
    `/items/${source.collection_name}?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return items
    .filter((item) => !isNoindexItem(item, source.noindex_field))
    .map((item) => normalizeSourceItem(item, source, settings))
    .filter((item): item is MetadataRoute.Sitemap[number] => item !== null);
}

async function getPromptMenuSitemapState(
  settings: SitemapSettings,
): Promise<PromptMenuSitemapState> {
  const noindexPaths = await getNoindexPagePaths();
  const [
    kinds,
    networks,
    goals,
    tags,
    tagCountRows,
    collections,
  ] = await Promise.all([
    getPromptMenuTaxonomyItems("prompt_content_kinds"),
    getPromptMenuTaxonomyItems("neural_networks"),
    getPromptMenuTaxonomyItems("prompt_goals"),
    getPromptMenuTaxonomyItems("prompt_tags"),
    getPromptMenuTagCountRows(),
    getPromptMenuCollections(),
  ]);
  const tagCounts = normalizePromptMenuTagCounts(tagCountRows);
  const excludedPaths = new Set(noindexPaths);

  kinds.forEach((item) => addExcludedPromptMenuTaxonomyPath(excludedPaths, "kind", item));
  networks.forEach((item) =>
    addExcludedPromptMenuTaxonomyPath(excludedPaths, "network", item),
  );
  goals.forEach((item) => addExcludedPromptMenuTaxonomyPath(excludedPaths, "goal", item));
  tags.forEach((item) => {
    if ((tagCounts.get(item.id) || 0) <= 0) {
      addPathToSet(excludedPaths, buildPromptMenuTaxonomyPath("tag", item.slug));
    }

    addExcludedPromptMenuTaxonomyPath(excludedPaths, "tag", item);
  });
  collections.forEach((item) => {
    if (
      item.status !== "published" ||
      item.is_active === false ||
      item.seo_noindex === true
    ) {
      addPathToSet(excludedPaths, buildPromptMenuTaxonomyPath("collection", item.slug));
    }
  });

  const entries = [
    ...kinds.map((item) => normalizePromptMenuTaxonomyItem("kind", item, settings)),
    ...networks.map((item) =>
      normalizePromptMenuTaxonomyItem("network", item, settings),
    ),
    ...goals.map((item) => normalizePromptMenuTaxonomyItem("goal", item, settings)),
    ...tags
      .filter((item) => (tagCounts.get(item.id) || 0) > 0)
      .map((item) => normalizePromptMenuTaxonomyItem("tag", item, settings)),
    ...collections.map((item) => normalizePromptMenuCollection(item, settings)),
  ].filter(
    (entry): entry is MetadataRoute.Sitemap[number] =>
      entry !== null &&
      !excludedPaths.has(getPathFromAbsoluteUrl(entry.url, settings.siteUrl)),
  );
  const allowedPaths = new Set<string>([normalizePath("/prompts-menu")]);

  entries.forEach((entry) => {
    allowedPaths.add(getPathFromAbsoluteUrl(entry.url, settings.siteUrl));
  });

  return {
    allowedPaths,
    entries,
    excludedPaths,
  };
}

async function getPromptMenuTaxonomyItems(
  collection: "neural_networks" | "prompt_content_kinds" | "prompt_goals" | "prompt_tags",
): Promise<DirectusPromptMenuTaxonomy[]> {
  return optionalDirectusRequest<DirectusPromptMenuTaxonomy[]>(
    [
      `/items/${collection}?`,
      new URLSearchParams({
        fields: "id,slug,is_active,seo_noindex",
        limit: "-1",
        sort: "sort,id",
      }).toString(),
    ].join(""),
    [],
  );
}

async function getPromptMenuTagCountRows(): Promise<DirectusPromptMenuTagCount[]> {
  const params = new URLSearchParams();

  params.set("aggregate[count]", "id");
  params.set("groupBy[]", "prompt_tags_id");
  params.set("filter[prompts_id][status][_eq]", "published");

  return optionalDirectusRequest<DirectusPromptMenuTagCount[]>(
    `/items/prompts_tags?${params.toString()}`,
    [],
  );
}

function normalizePromptMenuTagCounts(
  rows: DirectusPromptMenuTagCount[],
): Map<number, number> {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.prompt_tags_id) {
      return;
    }

    const tagId =
      typeof row.prompt_tags_id === "object"
        ? row.prompt_tags_id.id
        : Number(row.prompt_tags_id);
    const count = Number(row.count?.id || 0);

    if (Number.isFinite(tagId) && Number.isFinite(count)) {
      counts.set(tagId, count);
    }
  });

  return counts;
}

function addExcludedPromptMenuTaxonomyPath(
  paths: Set<string>,
  prefix: "goal" | "kind" | "network" | "tag",
  item: DirectusPromptMenuTaxonomy,
) {
  if (item.is_active === false || item.seo_noindex === true) {
    addPathToSet(paths, buildPromptMenuTaxonomyPath(prefix, item.slug));
  }
}

function buildPromptMenuTaxonomyPath(
  prefix: "collection" | "goal" | "kind" | "network" | "tag",
  slug: string | null,
): string {
  if (!slug) {
    return "";
  }

  return normalizePath(`/prompts-menu/${prefix}-${slug}`);
}

async function getPromptMenuCollections(): Promise<DirectusPromptMenuCollection[]> {
  return optionalDirectusRequest<DirectusPromptMenuCollection[]>(
    [
      "/items/prompt_collections?",
      new URLSearchParams({
        fields: "slug,status,is_active,updated_at,seo_noindex",
        limit: "-1",
        sort: "-published_at,-id",
      }).toString(),
    ].join(""),
    [],
  );
}

async function getNoindexPagePaths(): Promise<Set<string>> {
  const pages = await optionalDirectusRequest<DirectusNoindexPage[]>(
    [
      "/items/pages?",
      new URLSearchParams({
        fields: "slug,status,seo_noindex",
        filter: JSON.stringify({
          seo_noindex: { _eq: true },
          status: { _eq: "published" },
        }),
        limit: "-1",
      }).toString(),
    ].join(""),
    [],
  );

  return new Set(
    pages
      .map((page) => page.slug)
      .filter((slug): slug is string => Boolean(slug))
      .map(normalizePath),
  );
}

function normalizePromptMenuTaxonomyItem(
  prefix: "goal" | "kind" | "network" | "tag",
  item: DirectusPromptMenuTaxonomy,
  settings: SitemapSettings,
): MetadataRoute.Sitemap[number] | null {
  if (!item.slug || item.is_active === false) {
    return null;
  }

  if (item.seo_noindex === true) {
    return null;
  }

  return {
    url: toAbsoluteUrl(`/prompts-menu/${prefix}-${item.slug}`, settings.siteUrl),
    changeFrequency: settings.defaultChangeFrequency,
    priority: settings.defaultPriority,
  };
}

function normalizePromptMenuCollection(
  item: DirectusPromptMenuCollection,
  settings: SitemapSettings,
): MetadataRoute.Sitemap[number] | null {
  if (!item.slug || item.status !== "published" || item.is_active === false) {
    return null;
  }

  if (item.seo_noindex === true) {
    return null;
  }

  return {
    url: toAbsoluteUrl(`/prompts-menu/collection-${item.slug}`, settings.siteUrl),
    lastModified: normalizeDate(item.updated_at),
    changeFrequency: settings.defaultChangeFrequency,
    priority: settings.defaultPriority,
  };
}

async function optionalDirectusRequest<T>(
  path: string,
  fallback: T,
): Promise<T> {
  try {
    return await directusRequest<T>(path, { next: { revalidate: 60 } });
  } catch {
    return fallback;
  }
}

function getSourceFields(source: DirectusSitemapSource): string[] {
  const fields = new Set(["id", source.slug_field || "slug"]);

  if (source.date_field) {
    fields.add(source.date_field);
  }

  if (source.noindex_field) {
    fields.add(source.noindex_field);
  }

  if (source.status_field) {
    fields.add(source.status_field);
  }

  return [...fields];
}

function normalizeManualRoute(
  route: DirectusSitemapRoute,
  settings: SitemapSettings,
): MetadataRoute.Sitemap[number] {
  return {
    url: toAbsoluteUrl(route.path || "/", settings.siteUrl),
    lastModified: normalizeDate(route.last_modified),
    changeFrequency: route.change_frequency || settings.defaultChangeFrequency,
    priority: normalizePriority(route.priority) || settings.defaultPriority,
  };
}

function normalizeSourceItem(
  item: DirectusSitemapItem,
  source: DirectusSitemapSource,
  settings: SitemapSettings,
): MetadataRoute.Sitemap[number] | null {
  const slugField = source.slug_field || "slug";
  const slug = item[slugField];

  if (typeof slug !== "string" || !slug) {
    return null;
  }

  const path = buildItemPath(source.base_path || "/", slug);
  const dateValue = source.date_field ? item[source.date_field] : null;
  const lastModified =
    typeof dateValue === "string"
      ? normalizeDate(dateValue)
      : undefined;

  return {
    url: toAbsoluteUrl(path, settings.siteUrl),
    lastModified,
    changeFrequency: source.change_frequency || settings.defaultChangeFrequency,
    priority: normalizePriority(source.priority) || settings.defaultPriority,
  };
}

function buildItemPath(basePath: string, slug: string): string {
  const normalizedSlug = normalizePath(slug);

  if (basePath === "/" || slug.startsWith("/")) {
    return normalizedSlug;
  }

  return normalizePath(`${normalizePath(basePath)}/${slug}`);
}

function dedupeSitemapEntries(
  entries: MetadataRoute.Sitemap,
): MetadataRoute.Sitemap {
  const result = new Map<string, MetadataRoute.Sitemap[number]>();

  entries.forEach((entry) => {
    if (!result.has(entry.url)) {
      result.set(entry.url, entry);
    }
  });

  return [...result.values()];
}

function isNoindexItem(
  item: DirectusSitemapItem,
  noindexField: string | null,
): boolean {
  return Boolean(noindexField && item[noindexField] === true);
}

function isAllowedCollection(collection: string | null): boolean {
  return Boolean(collection && ALLOWED_SITEMAP_COLLECTIONS.has(collection));
}

function shouldIncludeSitemapEntry(
  entry: MetadataRoute.Sitemap[number],
  settings: SitemapSettings,
  promptMenuSitemap: PromptMenuSitemapState,
): boolean {
  const path = getPathFromAbsoluteUrl(entry.url, settings.siteUrl);

  if (promptMenuSitemap.excludedPaths.has(path)) {
    return false;
  }

  if (isPromptMenuPath(path)) {
    return promptMenuSitemap.allowedPaths.has(path);
  }

  return true;
}

function isPromptMenuPath(path: string): boolean {
  return path === "/prompts-menu" || path.startsWith("/prompts-menu/");
}

function addPathToSet(paths: Set<string>, path: string): void {
  if (path) {
    paths.add(path);
  }
}

function buildFallbackRobots(settings: SitemapSettings): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${toAbsoluteUrl(settings.sitemapPath, settings.siteUrl)}`,
  ].join("\n");
}

function buildFallbackRobotsMetadata(
  settings: SitemapSettings,
): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: toAbsoluteUrl(settings.sitemapPath, settings.siteUrl),
  };
}

function parseRobotsContent(content: string): MetadataRoute.Robots | null {
  const rules: Array<{
    allow?: string[];
    crawlDelay?: number;
    disallow?: string[];
    userAgent: string | string[];
  }> = [];
  const sitemaps: string[] = [];
  let host: string | undefined;
  let currentRule: (typeof rules)[number] | null = null;

  content
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*/, "").trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();

      if (!value && key !== "disallow") {
        return;
      }

      if (key === "user-agent") {
        currentRule = { userAgent: value || "*" };
        rules.push(currentRule);

        return;
      }

      if (key === "allow" && currentRule) {
        currentRule.allow = [...(currentRule.allow || []), value || "/"];

        return;
      }

      if (key === "disallow" && currentRule) {
        currentRule.disallow = [...(currentRule.disallow || []), value];

        return;
      }

      if (key === "crawl-delay" && currentRule) {
        const delay = Number(value);

        if (!Number.isNaN(delay)) {
          currentRule.crawlDelay = delay;
        }

        return;
      }

      if (key === "sitemap") {
        sitemaps.push(value);

        return;
      }

      if (key === "host") {
        host = value;
      }
    });

  if (rules.length === 0 && sitemaps.length === 0 && !host) {
    return null;
  }

  return {
    host,
    rules: rules.map(normalizeRobotsRule),
    sitemap: sitemaps.length > 1 ? sitemaps : sitemaps[0],
  };
}

function normalizeRobotsRule(rule: {
  allow?: string[];
  crawlDelay?: number;
  disallow?: string[];
  userAgent: string | string[];
}): RobotsRule {
  return {
    userAgent: rule.userAgent,
    allow: normalizeRobotsValue(rule.allow),
    disallow: normalizeRobotsValue(rule.disallow),
    crawlDelay: rule.crawlDelay,
  };
}

function normalizeRobotsValue(value: string[] | undefined): string | string[] | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }

  return value.length === 1 ? value[0] : value;
}

function getFallbackSettings(): SitemapSettings {
  return {
    defaultChangeFrequency: "weekly",
    defaultPriority: 0.7,
    siteUrl: normalizeSiteUrl(SITE_URL),
    sitemapPath: "/sitemap.xml",
  };
}

function normalizePriority(value: string | number | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const priority = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(priority)) {
    return undefined;
  }

  return Math.max(0, Math.min(1, priority));
}

function normalizeDate(value: string | null): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function normalizePath(value: string): string {
  const path = value.startsWith("/") ? value : `/${value}`;

  if (path === "/") {
    return path;
  }

  return path.replace(/\/+/g, "/").replace(/\/$/, "");
}

function toAbsoluteUrl(path: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${siteUrl}${normalizePath(path)}`;
}

function getPathFromAbsoluteUrl(url: string, siteUrl: string): string {
  if (!url.startsWith(siteUrl)) {
    return normalizePath(url);
  }

  return normalizePath(url.slice(siteUrl.length) || "/");
}
