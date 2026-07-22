import type { Metadata } from "next";

import { BalancePage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Баланс", robots: { index: false, follow: false } };

export default function Page() {
  return <BalancePage />;
}

