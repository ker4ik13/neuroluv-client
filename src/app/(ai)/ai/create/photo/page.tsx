import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Создать изображение",
  description: "Генерация и редактирование изображений с помощью AI-моделей.",
  alternates: { canonical: "/ai/create/photo" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CreateStudioPage kind="image" />;
}
