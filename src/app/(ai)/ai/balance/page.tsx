import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { BalancePage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/balance", {
    title: "Баланс",
    description: "Баланс, подписка и пополнение кредитов.",
  });
}

export default function Page() {
  return <BalancePage />;
}
