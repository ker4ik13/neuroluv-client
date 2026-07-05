import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getNewsDetailPageData } from "@/shared/api/directus/news";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
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
  const data = await getNewsDetailPageData(slug);

  if (!data) {
    return {};
  }

  return buildPageMetadata(data.item.seo, {
    author: data.item.author?.name,
    canonicalPath: `/news/${data.item.slug}`,
    fallbackDescription: data.item.description,
    fallbackImage: data.item.image,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    openGraphType: "article",
    publishedTime: data.item.publishedAt,
    variables: {
      AUTHOR: data.item.author?.name,
      TITLE: data.item.title,
      URL: `/news/${data.item.slug}`,
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
      <ContentDetailPage item={data.item} related={data.related} />
      <PageBlocks blocks={data.blocks} />
    </>
  );
}
