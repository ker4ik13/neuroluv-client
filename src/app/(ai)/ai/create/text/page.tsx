import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Создать текст",
  description: "Создавайте и дорабатывайте тексты с помощью AI в студии Нейролюба.",
  alternates: { canonical: "/ai/create/text" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CreateStudioPage kind="text" />;
}
