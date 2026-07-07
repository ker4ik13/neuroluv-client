import { NextRequest, NextResponse } from "next/server";

const DEFAULT_DIRECTUS_URL = "https://dev.cms.neuroluv.ru";
const DIRECTUS_URL = (
  process.env.NEXT_PUBLIC_DIRECTUS_URL || DEFAULT_DIRECTUS_URL
).replace(/\/$/, "");
const REDIRECTS_CACHE_TTL_MS = 60_000;

type DirectusRedirect = {
  from_path: string | null;
  is_active: boolean | null;
  preserve_query: boolean | null;
  redirect_type: "permanent" | "temporary" | string | null;
  to_url: string | null;
};

type DirectusRedirectsResponse = {
  data?: DirectusRedirect[];
};

type RedirectRule = {
  fromPath: string;
  preserveQuery: boolean;
  status: 301 | 302;
  toUrl: string;
};

type RedirectsCache = {
  expiresAt: number;
  rules: RedirectRule[];
};

let redirectsCache: RedirectsCache | null = null;

export async function proxy(request: NextRequest) {
  const duplicateSlashesTarget = buildDuplicateSlashesTarget(request);

  if (duplicateSlashesTarget) {
    return NextResponse.redirect(duplicateSlashesTarget, 301);
  }

  const pathname = normalizePath(request.nextUrl.pathname);
  const redirects = await getRedirectRules();
  const redirect = redirects.find((rule) => rule.fromPath === pathname);

  if (!redirect) {
    return NextResponse.next();
  }

  const target = buildRedirectTarget(request, redirect);

  if (isSameUrl(request.nextUrl, target)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(target, redirect.status);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|favicon.svg|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:avif|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|otf|pdf|png|svg|ttf|txt|webm|webmanifest|woff|woff2|xml)$).*)",
  ],
};

async function getRedirectRules(): Promise<RedirectRule[]> {
  const now = Date.now();

  if (redirectsCache && redirectsCache.expiresAt > now) {
    return redirectsCache.rules;
  }

  try {
    const params = new URLSearchParams({
      fields: "from_path,to_url,redirect_type,preserve_query,is_active",
      limit: "-1",
      sort: "sort,id",
    });

    params.set("filter[is_active][_eq]", "true");

    const response = await fetch(`${DIRECTUS_URL}/items/redirects?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return redirectsCache?.rules || [];
    }

    const payload = (await response.json()) as DirectusRedirectsResponse;
    const rules = normalizeRedirects(payload.data || []);

    redirectsCache = {
      expiresAt: now + REDIRECTS_CACHE_TTL_MS,
      rules,
    };

    return rules;
  } catch {
    return redirectsCache?.rules || [];
  }
}

function normalizeRedirects(redirects: DirectusRedirect[]): RedirectRule[] {
  const rules = new Map<string, RedirectRule>();

  redirects.forEach((redirect) => {
    if (!redirect.from_path || !redirect.to_url || redirect.is_active === false) {
      return;
    }

    const fromPath = normalizePath(redirect.from_path);
    const toUrl = redirect.to_url.trim();

    if (!fromPath || !toUrl) {
      return;
    }

    rules.set(fromPath, {
      fromPath,
      preserveQuery: redirect.preserve_query !== false,
      status: redirect.redirect_type === "temporary" ? 302 : 301,
      toUrl,
    });
  });

  return [...rules.values()];
}

function buildRedirectTarget(request: NextRequest, redirect: RedirectRule): URL {
  const target = isAbsoluteUrl(redirect.toUrl)
    ? new URL(redirect.toUrl)
    : new URL(normalizeTargetPath(redirect.toUrl), request.nextUrl.origin);

  if (redirect.preserveQuery && request.nextUrl.search) {
    const sourceParams = new URLSearchParams(request.nextUrl.search);

    sourceParams.forEach((value, key) => {
      if (!target.searchParams.has(key)) {
        target.searchParams.append(key, value);
      }
    });
  }

  return target;
}

function normalizePath(path: string): string {
  const cleanPath = path.split("?")[0]?.trim() || "/";
  const withLeadingSlash = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");

  if (collapsed.length > 1) {
    return collapsed.replace(/\/+$/, "");
  }

  return "/";
}

function normalizeTargetPath(path: string): string {
  if (path.startsWith("?")) {
    return `/${path}`;
  }

  return path.startsWith("/") ? path : `/${path}`;
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function buildDuplicateSlashesTarget(request: NextRequest): URL | null {
  if (!/\/{2,}/.test(request.nextUrl.pathname)) {
    return null;
  }

  const target = request.nextUrl.clone();
  target.pathname = target.pathname.replace(/\/{2,}/g, "/") || "/";

  return target;
}

function isSameUrl(source: URL, target: URL): boolean {
  return source.origin === target.origin &&
    normalizePath(source.pathname) === normalizePath(target.pathname) &&
    source.search === target.search;
}
