import { NextResponse } from "next/server";

import type { NewsSortOrder } from "@/entities/news";
import { getNewsPageData } from "@/shared/api/directus/news";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  try {
    const data = await getNewsPageData({
      page: normalizePage(searchParams.get("page")),
      q: getQueryParam(searchParams, "q"),
      sort: normalizeSort(searchParams.get("sort")),
      tag: getQueryParam(searchParams, "tag"),
      topic: getQueryParam(searchParams, "topic"),
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Failed to load news" },
      { status: 500 },
    );
  }
}

function normalizePage(value: string | null): number {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function normalizeSort(value: string | null): NewsSortOrder {
  if (value === "old") {
    return value;
  }

  return "fresh";
}

function getQueryParam(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);

  return value || null;
}
