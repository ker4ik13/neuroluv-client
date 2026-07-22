import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Создать видео",
  description: "Генерация AI-видео по тексту или изображению в студии Нейролюба.",
  alternates: { canonical: "/ai/create/video" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CreateStudioPage kind="video" />;
}
