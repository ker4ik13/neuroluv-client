import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { directusRequest } from "@/shared/api/directus/client";
import {
  DIRECTUS_PREVIEW_SECRET,
  DIRECTUS_PREVIEW_TOKEN,
} from "@/shared/config/directus";
import { canReadDirectusItemStatus } from "@/shared/lib/preview/directus-preview";

export const dynamic = "force-dynamic";

type PreviewCollection = "articles" | "news" | "pages" | "prompts" | "services";

type PreviewRecord = {
  id: number | string;
  slug: string | null;
  status: string | null;
};

const COLLECTION_ALIASES: Record<string, PreviewCollection> = {
  article: "articles",
  articles: "articles",
  news: "news",
  page: "pages",
  pages: "pages",
  prompt: "prompts",
  prompts: "prompts",
  service: "services",
  services: "services",
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const secret = searchParams.get("secret");
  const collectionParam = searchParams.get("collection");
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const collection = collectionParam
    ? COLLECTION_ALIASES[collectionParam.toLowerCase()]
    : null;

  if (!DIRECTUS_PREVIEW_SECRET || secret !== DIRECTUS_PREVIEW_SECRET) {
    return createPlainResponse("Invalid preview secret", 401);
  }

  if (!DIRECTUS_PREVIEW_TOKEN) {
    return createPlainResponse("Directus preview token is not configured", 500);
  }

  if (!collection || (!id && !slug)) {
    return createPlainResponse("Preview collection and id or slug are required", 400);
  }

  const record = await getPreviewRecord({ collection, id, slug });

  if (!record?.slug || !canReadDirectusItemStatus(record.status, true)) {
    return createPlainResponse("Preview record was not found", 404);
  }

  const mode = await draftMode();
  mode.enable();

  const redirectUrl = new URL(getPreviewPath(collection, record.slug), request.url);
  const response = NextResponse.redirect(redirectUrl);

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

async function getPreviewRecord({
  collection,
  id,
  slug,
}: {
  collection: PreviewCollection;
  id: string | null;
  slug: string | null;
}): Promise<PreviewRecord | null> {
  try {
    if (id) {
      return await directusRequest<PreviewRecord>(
        `/items/${collection}/${encodeURIComponent(id)}?fields=id,slug,status`,
        {
          cache: "no-store",
          token: DIRECTUS_PREVIEW_TOKEN,
        },
      );
    }

    const params = new URLSearchParams({
      fields: "id,slug,status",
      limit: "1",
    });

    params.set("filter[slug][_eq]", slug || "");

    const records = await directusRequest<PreviewRecord[]>(
      `/items/${collection}?${params.toString()}`,
      {
        cache: "no-store",
        token: DIRECTUS_PREVIEW_TOKEN,
      },
    );

    return records[0] || null;
  } catch {
    return null;
  }
}

function getPreviewPath(collection: PreviewCollection, slug: string): string {
  if (collection === "pages") {
    return slug.startsWith("/") ? slug : `/${slug}`;
  }

  if (collection === "services") {
    return `/services/${slug}`;
  }

  return `/${collection}/${slug}`;
}

function createPlainResponse(message: string, status: number): NextResponse {
  return new NextResponse(message, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  });
}
