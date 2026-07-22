import type { Metadata } from "next";

import { hasAiPublicFaq } from "@/shared/api/ai/public";
import { FaqPage } from "@/widgets/ai-pages";

export async function generateMetadata(): Promise<Metadata> {
  const indexable = await hasAiPublicFaq();

  return {
    title: "Частые вопросы",
    description: "Ответы на вопросы об AI-студии Нейролюба, генерациях, оплате и файлах.",
    alternates: { canonical: "/ai/faq" },
    robots: { index: indexable, follow: indexable },
  };
}

export default function Page() {
  return <FaqPage />;
}
