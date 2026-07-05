import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPromptDetailPageData,
  getPromptSlugs,
} from "@/shared/api/directus/prompts";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptDetailPage } from "@/widgets/prompt-detail";

type PromptDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getPromptSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PromptDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPromptDetailPageData(slug);

  if (!data) {
    return {};
  }

  return buildPageMetadata(data.item.seo, {
    author: data.item.author?.name,
    canonicalPath: `/prompts/${data.item.slug}`,
    fallbackDescription: data.item.description,
    fallbackImage: data.item.image,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    openGraphType: "article",
    publishedTime: data.item.publishedAt,
    variables: {
      AUTHOR: data.item.author?.name,
      TITLE: data.item.title,
      URL: `/prompts/${data.item.slug}`,
    },
  });
}

export default async function PromptDetailRoute({
  params,
}: PromptDetailRouteProps) {
  const { slug } = await params;
  const data = await getPromptDetailPageData(slug);

  if (!data) {
    notFound();
  }

  return (
    <>
      <PromptDetailPage item={data.item} related={data.related} />
      <PageBlocks blocks={data.blocks} />
    </>
  );
}
