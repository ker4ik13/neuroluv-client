import { NextResponse } from "next/server";

import type { PromptSortOrder } from "@/entities/prompt";
import { getPromptsPageData } from "@/shared/api/directus/prompts";
import {
  getBoundedQueryParam,
  normalizeApiPage,
} from "@/shared/lib/api/query-params";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  try {
    const data = await getPromptsPageData({
      collection: getBoundedQueryParam(searchParams, "collection"),
      goal: getBoundedQueryParam(searchParams, "goal"),
      kind: getBoundedQueryParam(searchParams, "kind"),
      network: getBoundedQueryParam(searchParams, "network"),
      page: normalizeApiPage(searchParams.get("page")),
      q: getBoundedQueryParam(searchParams, "q"),
      sort: normalizeSort(searchParams.get("sort")),
      tag: getBoundedQueryParam(searchParams, "tag"),
      type: getBoundedQueryParam(searchParams, "type"),
    });

    return NextResponse.json(data, { headers: getPublicCacheHeaders() });
  } catch (error) {
    console.error("Failed to load prompts API data", error);
    return NextResponse.json(
      { message: "Failed to load prompts" },
      { status: 500 },
    );
  }
}

function normalizeSort(value: string | null): PromptSortOrder {
  if (value === "old" || value === "popular") {
    return value;
  }

  return "fresh";
}

function getPublicCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}
