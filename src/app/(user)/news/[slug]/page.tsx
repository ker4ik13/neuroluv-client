import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getNewsDetailPageData,
  getNewsMetadataBySlug,
} from "@/shared/api/directus/news";
import {
  buildBreadcrumbJsonLd,
  buildNewsArticleJsonLd,
  buildWebPageJsonLd,
} from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { ContentDetailPage } from "@/widgets/content-detail";
import { PageBlocks } from "@/widgets/page-blocks";

export const revalidate = 60;

type NewsDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: NewsDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getNewsMetadataBySlug(slug);

  if (!item) {
    return {};
  }

  return buildPageMetadata(item.seo, {
    author: item.author?.name,
    canonicalPath: `/news/${item.slug}`,
    fallbackDescription: item.description,
    fallbackImage: item.image,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    openGraphType: "article",
    publishedTime: item.publishedAt,
    variables: {
      AUTHOR: item.author?.name,
      TITLE: item.title,
      URL: `/news/${item.slug}`,
    },
  });
}

export default async function NewsDetailRoute({ params }: NewsDetailRouteProps) {
  const { slug } = await params;
  const data = await getNewsDetailPageData(slug);

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
          buildNewsArticleJsonLd(data.item),
          buildBreadcrumbJsonLd([
            { name: "Главная", url: "/" },
            { name: "Новости", url: "/news" },
            { name: data.item.title, url: data.item.href },
          ]),
        ]}
      />
      <ContentDetailPage item={data.item} related={data.related} />
      <PageBlocks blocks={data.blocks} />
    </>
  );
}
