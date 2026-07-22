import type { Metadata } from "next";

import { WorkDetailPage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Работа", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkDetailPage id={id} />;
}

