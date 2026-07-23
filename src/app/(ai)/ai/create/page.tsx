import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create", {
    title: "Создать",
    description: "Выберите тип AI-генерации.",
  });
}

export default function Page() {
  return <CreateStudioPage kind="entry" />;
}
