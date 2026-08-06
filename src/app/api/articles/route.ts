import { NextResponse } from "next/server";

import type { NewsSortOrder } from "@/entities/news";
import { getArticlesPageData } from "@/shared/api/directus/articles";
import {
  getBoundedQueryParam,
  normalizeApiPage,
} from "@/shared/lib/api/query-params";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const topic = getBoundedQueryParam(searchParams, "topic");

  try {
    const data = await getArticlesPageData({
      page: normalizeApiPage(searchParams.get("page")),
      q: getBoundedQueryParam(searchParams, "q"),
      sort: normalizeSort(searchParams.get("sort")),
      tag: topic ? null : getBoundedQueryParam(searchParams, "tag"),
      topic,
    });

    return NextResponse.json(data, { headers: getPublicCacheHeaders() });
  } catch (error) {
    console.error("Failed to load articles API data", error);
    return NextResponse.json(
      { message: "Failed to load articles" },
      { status: 500 },
    );
  }
}

function normalizeSort(value: string | null): NewsSortOrder {
  if (value === "old") {
    return value;
  }

  return "fresh";
}

function getPublicCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}
