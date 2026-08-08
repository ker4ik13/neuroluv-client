import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/video", {
    title: "Создать видео",
    description: "Генерация AI-видео по тексту или изображению в студии Нейролюба.",
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
      kind="video"
    />
  );
}

function normalizeModelParam(value: string | string[] | undefined) {
  const model = (Array.isArray(value) ? value[0] : value)?.trim();
  return model ? model.slice(0, 120) : undefined;
}
