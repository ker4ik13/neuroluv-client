import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAiPublicShare } from "@/shared/api/ai/public";
import { SharePage } from "@/widgets/ai-pages";

export const metadata: Metadata = {
  title: "Публичная работа",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ shareSlug: string }>;
}) {
  const { shareSlug } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(shareSlug)) {
    notFound();
  }
  const share = await getAiPublicShare(shareSlug);

  if (share.status === 404 || share.status === 410) {
    notFound();
  }

  return <SharePage initialShare={share.data} slug={shareSlug} />;
}
