import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { preserveAnalyticsQueryInUrl } from "@/shared/lib/analytics/tracking-query";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const mode = await draftMode();
  mode.disable();

  const nextPath = request.nextUrl.searchParams.get("next") || "/";
  const redirectUrl = new URL(
    String(
      preserveAnalyticsQueryInUrl(normalizeNextPath(nextPath), request.url),
    ),
    request.url,
  );
  const response = NextResponse.redirect(redirectUrl);

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

function normalizeNextPath(nextPath: string): string {
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}
