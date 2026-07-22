import type { Metadata } from "next";

import { CreateStudioPage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Создать",
  alternates: { canonical: "/ai" },
  robots: { index: false, follow: true },
};

export default function Page() {
  return <CreateStudioPage kind="entry" />;
}
