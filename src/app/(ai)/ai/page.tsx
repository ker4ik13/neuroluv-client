import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Генерация текста, изображений и видео",
  description:
    "Создавайте изображения, видео и тексты с помощью нейросетей в единой AI-студии Нейролюба.",
  alternates: { canonical: "/ai" },
  openGraph: {
    title: "Нейролюб AI — генерация текста, изображений и видео",
    description:
      "Создавайте изображения, видео и тексты с помощью нейросетей в единой AI-студии Нейролюба.",
    url: "/ai",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function AiPage() {
  return <CreateStudioPage kind="entry" />;
}
