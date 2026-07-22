import type { Metadata } from "next";

import { hasAiPublicPrompts } from "@/shared/api/ai/public";
import { PromptsPage } from "@/widgets/ai-pages";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const query = await searchParams;
  const hasFilters = Object.values(query).some((value) => value !== undefined);
  const indexable = !hasFilters && (await hasAiPublicPrompts());

  return {
    title: "Каталог промптов",
    description: "Готовые AI-промпты редакции Нейролюба.",
    alternates: { canonical: "/ai/prompts" },
    openGraph: {
      title: "Каталог AI-промптов — Нейролюб",
      description: "Готовые AI-промпты редакции Нейролюба.",
      url: "/ai/prompts",
      type: "website",
    },
    robots: { index: indexable, follow: indexable },
  };
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
