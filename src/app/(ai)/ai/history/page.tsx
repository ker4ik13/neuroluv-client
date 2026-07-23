import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { HistoryPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/history", {
    title: "История",
    description: "История операций и генераций.",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ run?: string | string[] }>;
}) {
  const query = await searchParams;
  const runId = Array.isArray(query.run) ? query.run[0] : query.run;
  return <HistoryPage runId={runId} />;
}
