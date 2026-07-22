import type { Metadata } from "next";

import { WorksPage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Мои работы", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <WorksPage initialSearchParams={toSingleValues(query)} />;
}

function toSingleValues(values: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}
