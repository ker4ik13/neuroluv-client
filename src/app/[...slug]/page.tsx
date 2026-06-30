import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";

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
  const seo = await getPageSeoBySlug(pageSlug);

  if (!seo) {
    notFound();
  }

  return null;
}

async function getPageSlug(params: DynamicPageProps["params"]): Promise<string> {
  const { slug } = await params;

  return `/${slug.join("/")}`;
}
