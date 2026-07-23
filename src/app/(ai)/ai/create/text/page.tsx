import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { CreateStudioPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/create/text", {
    title: "Создать текст",
    description: "Создавайте и дорабатывайте тексты с помощью AI в студии Нейролюба.",
  });
}

export default function Page() {
  return <CreateStudioPage kind="text" />;
}
