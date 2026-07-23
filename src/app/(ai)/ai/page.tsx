import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata(
    "/ai",
    {
      title: "Генерация текста, изображений и видео",
      description:
        "Создавайте изображения, видео и тексты с помощью нейросетей в единой AI-студии Нейролюба.",
    },
    { indexable: true },
  );
}

export default function AiPage() {
  return <CreateStudioPage kind="entry" />;
}
