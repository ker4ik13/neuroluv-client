import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { WorksPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/works", {
    title: "Мои работы",
    description: "Сохранённые изображения и видео.",
  });
}

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
