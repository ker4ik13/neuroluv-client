import { NextResponse } from "next/server";

import type { PromptSortOrder } from "@/entities/prompt";
import { getPromptsPageData } from "@/shared/api/directus/prompts";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  try {
    const data = await getPromptsPageData({
      goal: getQueryParam(searchParams, "goal"),
      network: getQueryParam(searchParams, "network"),
      page: normalizePage(searchParams.get("page")),
      q: getQueryParam(searchParams, "q"),
      sort: normalizeSort(searchParams.get("sort")),
      tag: getQueryParam(searchParams, "tag"),
      type: getQueryParam(searchParams, "type"),
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Failed to load prompts" },
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

function normalizeSort(value: string | null): PromptSortOrder {
  if (value === "old" || value === "popular") {
    return value;
  }

  return "fresh";
}

function getQueryParam(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);

  return value || null;
}
