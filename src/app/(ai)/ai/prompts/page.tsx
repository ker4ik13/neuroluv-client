import type { Metadata } from "next";

import { getAiPublicPromptCatalog } from "@/shared/api/ai/public";
import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { PromptsPage } from "@/widgets/ai-pages";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/prompts", {
    title: "Каталог промптов",
    description: "Готовые AI-промпты редакции Нейролюба.",
  });
}

export default async function Page() {
  const initialCatalog = await getAiPublicPromptCatalog();

  return <PromptsPage initialCatalog={initialCatalog} />;
}
