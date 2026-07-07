import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPromptDetailPageData } from "@/shared/api/directus/prompts";
import {
  buildBreadcrumbJsonLd,
  buildPromptJsonLd,
  buildWebPageJsonLd,
} from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptDetailPage } from "@/widgets/prompt-detail";

export const revalidate = 60;

type PromptDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return [];
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
      <JsonLd
        data={[
          buildWebPageJsonLd({
            description: data.item.description,
            image: data.item.image,
            title: data.item.title,
            url: data.item.href,
          }),
          buildPromptJsonLd(data.item),
          buildBreadcrumbJsonLd([
            { name: "Главная", url: "/" },
            { name: "Промпты", url: "/prompts" },
            { name: data.item.title, url: data.item.href },
          ]),
        ]}
      />
      <PromptDetailPage item={data.item} related={data.related} />
      <PageBlocks blocks={data.blocks} />
    </>
  );
}
