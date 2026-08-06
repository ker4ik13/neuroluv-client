import { NextResponse } from "next/server";

import type { NewsSortOrder } from "@/entities/news";
import { getNewsPageData } from "@/shared/api/directus/news";
import {
  getBoundedQueryParam,
  normalizeApiPage,
} from "@/shared/lib/api/query-params";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const topic = getBoundedQueryParam(searchParams, "topic");

  try {
    const data = await getNewsPageData({
      page: normalizeApiPage(searchParams.get("page")),
      q: getBoundedQueryParam(searchParams, "q"),
      sort: normalizeSort(searchParams.get("sort")),
      tag: topic ? null : getBoundedQueryParam(searchParams, "tag"),
      topic,
    });

    return NextResponse.json(data, { headers: getPublicCacheHeaders() });
  } catch (error) {
    console.error("Failed to load news API data", error);
    return NextResponse.json(
      { message: "Failed to load news" },
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
