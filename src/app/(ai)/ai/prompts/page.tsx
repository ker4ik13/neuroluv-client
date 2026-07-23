import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { PromptsPage } from "@/widgets/ai-pages";

export async function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/prompts", {
    title: "Каталог промптов",
    description: "Готовые AI-промпты редакции Нейролюба.",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <PromptsPage initialSearchParams={toSingleValues(query)} />;
}

function toSingleValues(values: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}
