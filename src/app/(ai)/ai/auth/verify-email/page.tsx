import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { AccountEmailActionPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/auth/verify-email", {
    title: "Подтверждение email",
    description: "Подтверждение адреса электронной почты в Нейролюб Studio.",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  return <AccountEmailActionPage action="verify-email" token={token?.slice(0, 512) || null} />;
}
