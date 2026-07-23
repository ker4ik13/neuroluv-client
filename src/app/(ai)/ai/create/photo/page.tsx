import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/photo", {
    title: "Создать изображение",
    description: "Генерация и редактирование изображений с помощью AI-моделей.",
  });
}

export default function Page() {
  return <CreateStudioPage kind="image" />;
}
