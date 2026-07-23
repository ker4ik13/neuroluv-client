import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { ReferralsPage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/referrals", {
    title: "Партнёрская программа",
    description: "Реферальные ссылки, начисления и выплаты.",
  });
}

export default function Page() {
  return <ReferralsPage />;
}
