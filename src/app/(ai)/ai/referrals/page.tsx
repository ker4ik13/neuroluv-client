import type { Metadata } from "next";

import { ReferralsPage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Партнёрская программа", robots: { index: false, follow: false } };

export default function Page() {
  return <ReferralsPage />;
}

