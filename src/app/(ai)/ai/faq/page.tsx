import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { FaqPage } from "@/widgets/ai-pages";

export async function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/faq", {
    title: "Частые вопросы",
    description: "Ответы на вопросы об AI-студии Нейролюба, генерациях, оплате и файлах.",
  });
}

export default function Page() {
  return <FaqPage />;
}
