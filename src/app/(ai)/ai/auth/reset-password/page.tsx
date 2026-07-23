import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { AccountEmailActionPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/auth/reset-password", {
    title: "Восстановление пароля",
    description: "Безопасное восстановление доступа к Нейролюб Studio.",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  return <AccountEmailActionPage action="reset-password" token={token?.slice(0, 512) || null} />;
}
