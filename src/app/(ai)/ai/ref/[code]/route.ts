import { type NextRequest, NextResponse } from "next/server";

import { AI_API_URL } from "@/shared/config/ai";

const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const TRACKING_PARAMETERS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  if (!REFERRAL_CODE_PATTERN.test(code)) {
    return NextResponse.redirect(new URL("/ai", request.url), 302);
  }

  const attributionUrl = new URL(`${AI_API_URL}/referrals/entry`);
  attributionUrl.searchParams.set("code", code);
  attributionUrl.searchParams.set("landing", "/ai");

  for (const [sourceName, targetName] of TRACKING_PARAMETERS) {
    const value = request.nextUrl.searchParams.get(sourceName);

    if (value) {
      attributionUrl.searchParams.set(targetName, value.slice(0, 120));
    }
  }

  return NextResponse.redirect(attributionUrl, 307);
}
