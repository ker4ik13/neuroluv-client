import type { Metadata } from "next";

import { getHomePage } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { PageBlocks } from "@/widgets/page-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/");

  return buildPageMetadata(seo);
}

export default async function Home() {
  const page = await getHomePage();

  if (!page) {
    return null;
  }

  return <PageBlocks blocks={page.blocks} />;
}
