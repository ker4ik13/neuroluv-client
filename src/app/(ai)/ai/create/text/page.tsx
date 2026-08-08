import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/text", {
    title: "Создать текст",
    description: "Создавайте и дорабатывайте тексты с помощью AI в студии Нейролюба.",
  });
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ model?: string | string[] }>;
}) {
  const query = await searchParams;
  return (
    <CreateStudioPage
      initialModelSlug={normalizeModelParam(query.model)}
      kind="text"
    />
  );
}

function normalizeModelParam(value: string | string[] | undefined) {
  const model = (Array.isArray(value) ? value[0] : value)?.trim();
  return model ? model.slice(0, 120) : undefined;
}
