import { NextResponse } from "next/server";

import { getPromptCollectionsPageData } from "@/shared/api/directus/prompts";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;

  try {
    const data = await getPromptCollectionsPageData({
      page: normalizePage(searchParams.get("page")),
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { message: "Failed to load prompt collections" },
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
