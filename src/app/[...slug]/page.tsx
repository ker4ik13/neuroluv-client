import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { PageBlocks } from "@/widgets/page-blocks";

type DynamicPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const pageSlug = await getPageSlug(params);
  const seo = await getPageSeoBySlug(pageSlug);

  return buildPageMetadata(seo);
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const pageSlug = await getPageSlug(params);
  const page = await getPageBySlug(pageSlug);

  if (!page) {
    notFound();
  }

  return <PageBlocks blocks={page.blocks} />;
}

async function getPageSlug(params: DynamicPageProps["params"]): Promise<string> {
  const { slug } = await params;

  return `/${slug.join("/")}`;
}
