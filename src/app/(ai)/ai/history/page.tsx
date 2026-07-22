import type { Metadata } from "next";

import { HistoryPage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "История", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ run?: string | string[] }>;
}) {
  const query = await searchParams;
  const runId = Array.isArray(query.run) ? query.run[0] : query.run;
  return <HistoryPage runId={runId} />;
}
