import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/photo", {
    title: "Создать изображение",
    description: "Генерация и редактирование изображений с помощью AI-моделей.",
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
      kind="image"
    />
  );
}

function normalizeModelParam(value: string | string[] | undefined) {
  const model = (Array.isArray(value) ? value[0] : value)?.trim();
  return model ? model.slice(0, 120) : undefined;
}
