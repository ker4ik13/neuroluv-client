import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getPromptDetailPageData,
  getPromptSlugs,
} from "@/shared/api/directus/prompts";
import { SITE_URL } from "@/shared/config/site";
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

  const image = data.item.image;

  return {
    title: data.item.title,
    description: data.item.description,
    alternates: {
      canonical: `${SITE_URL}/prompts/${data.item.slug}`,
    },
    openGraph: {
      title: data.item.title,
      description: data.item.description,
      type: "article",
      url: `${SITE_URL}/prompts/${data.item.slug}`,
      publishedTime: data.item.publishedAt || undefined,
      images: image
        ? [
            {
              url: image.url,
              alt: image.title,
              width: image.width || undefined,
              height: image.height || undefined,
              type: image.type || undefined,
            },
          ]
        : [],
    },
  };
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
