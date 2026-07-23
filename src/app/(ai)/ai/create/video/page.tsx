import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/video", {
    title: "Создать видео",
    description: "Генерация AI-видео по тексту или изображению в студии Нейролюба.",
  });
}

export default function Page() {
  return <CreateStudioPage kind="video" />;
}
