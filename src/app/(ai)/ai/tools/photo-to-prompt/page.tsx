import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Промпт из фотографии",
  description: "Получите структурированный промпт по загруженному изображению.",
  alternates: { canonical: "/ai/tools/photo-to-prompt" },
  robots: { index: true, follow: true },
};

export default function Page() {
  return <CreateStudioPage kind="photo-to-prompt" />;
}
