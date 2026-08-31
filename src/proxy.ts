import { NextRequest, NextResponse } from "next/server";
import { shouldPreserveAnalyticsQueryParameter } from "@/shared/lib/analytics/tracking-query";

const DEFAULT_DIRECTUS_URL = "https://dev.cms.neuroluv.ru";
const DIRECTUS_URL = (
  process.env.NEXT_PUBLIC_DIRECTUS_URL || DEFAULT_DIRECTUS_URL
).replace(/\/$/, "");
const AI_API_URL = (
  process.env.NEXT_PUBLIC_AI_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.neuroluv.ru/v1"
    : "http://localhost:4000/v1")
).replace(/\/$/, "");
const REDIRECTS_CACHE_TTL_MS = 60_000;
const YANDEX_METRIKA_HOSTS = [
  "mc.yandex.ru",
  "mc.yandex.az",
  "mc.yandex.by",
  "mc.yandex.co.il",
  "mc.yandex.com",
  "mc.yandex.com.am",
  "mc.yandex.com.ge",
  "mc.yandex.com.tr",
  "mc.yandex.ee",
  "mc.yandex.fr",
  "mc.yandex.kg",
  "mc.yandex.kz",
  "mc.yandex.lt",
  "mc.yandex.lv",
  "mc.yandex.md",
  "mc.yandex.tj",
  "mc.yandex.tm",
  "mc.yandex.uz",
  "mc.webvisor.com",
  "mc.webvisor.org",
] as const;
const YANDEX_METRIKA_HTTPS_ORIGINS = YANDEX_METRIKA_HOSTS.map(
  (host) => `https://${host}`,
);
const YANDEX_METRIKA_WSS_ORIGINS = YANDEX_METRIKA_HOSTS.map(
  (host) => `wss://${host}`,
);

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
  const isAiPath = pathname === "/ai" || pathname.startsWith("/ai/");
  const redirects = await getRedirectRules();
  const redirect = redirects.find((rule) => rule.fromPath === pathname);

  if (redirect) {
    const target = buildRedirectTarget(request, redirect);

    if (!isSameUrl(request.nextUrl, target)) {
      return NextResponse.redirect(target, redirect.status);
    }
  }

  return isAiPath ? nextAiResponse(request) : NextResponse.next();
}

function nextAiResponse(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const contentSecurityPolicy = buildAiContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  // A CSP nonce is valid for one response only. Never allow an intermediary to
  // reuse AI HTML with a nonce from another request.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  return response;
}

function buildAiContentSecurityPolicy(nonce: string): string {
  const directusOrigin = new URL(DIRECTUS_URL).origin;
  const apiOrigin = new URL(AI_API_URL).origin;
  const metrikaHttpsOrigins = YANDEX_METRIKA_HTTPS_ORIGINS.join(" ");
  const metrikaConnectOrigins = [
    ...YANDEX_METRIKA_HTTPS_ORIGINS,
    ...YANDEX_METRIKA_WSS_ORIGINS,
  ].join(" ");
  const developmentScriptPolicy =
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://telegram.org https://mc.yandex.ru https://yastatic.net${developmentScriptPolicy}`,
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${apiOrigin} ${directusOrigin} ${metrikaConnectOrigins}`,
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `child-src blob: ${metrikaHttpsOrigins}`,
    `frame-src blob: ${metrikaHttpsOrigins}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://web.telegram.org",
  ];

  if (process.env.NODE_ENV === "production") {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
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

    const response = await fetch(
      `${DIRECTUS_URL}/items/redirects?${params.toString()}`,
      {
        cache: "no-store",
      },
    );

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
    if (
      !redirect.from_path ||
      !redirect.to_url ||
      redirect.is_active === false
    ) {
      return;
    }

    const rawFromPath = redirect.from_path.trim();
    const toUrl = redirect.to_url.trim();

    if (!isSupportedRedirectSource(rawFromPath) || !toUrl) {
      return;
    }

    const fromPath = normalizePath(rawFromPath);

    if (isRelativeSelfRedirect(fromPath, toUrl)) {
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

function buildRedirectTarget(
  request: NextRequest,
  redirect: RedirectRule,
): URL {
  const target = isAbsoluteUrl(redirect.toUrl)
    ? new URL(redirect.toUrl)
    : new URL(normalizeTargetPath(redirect.toUrl), request.nextUrl.origin);

  if (request.nextUrl.search) {
    const sourceParams = new URLSearchParams(request.nextUrl.search);

    sourceParams.forEach((value, key) => {
      if (
        (redirect.preserveQuery ||
          (target.origin === request.nextUrl.origin &&
            shouldPreserveAnalyticsQueryParameter(key))) &&
        !target.searchParams.has(key)
      ) {
        target.searchParams.append(key, value);
      }
    });
  }

  return target;
}

function normalizePath(path: string): string {
  const cleanPath = path.split("?")[0]?.trim() || "/";
  const withLeadingSlash = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;
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

function isSupportedRedirectSource(path: string): boolean {
  return Boolean(path) && !/[?#*]/.test(path) && !/\/{2,}/.test(path);
}

function isRelativeSelfRedirect(fromPath: string, toUrl: string): boolean {
  if (isAbsoluteUrl(toUrl) || /[?#]/.test(toUrl)) {
    return false;
  }

  return normalizePath(toUrl) === fromPath;
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
  return (
    source.origin === target.origin &&
    normalizePath(source.pathname) === normalizePath(target.pathname) &&
    source.search === target.search
  );
}
