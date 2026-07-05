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
    const [routes, configuredSources] = await Promise.all([
      getManualSitemapRoutes(),
      getSitemapSources(),
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
    ]);

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
  if (sources.some((source) => source.collection_name === "pages")) {
    return sources;
  }

  return [
    ...sources,
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
  ];
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
