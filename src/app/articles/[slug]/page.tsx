import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getArticleDetailPageData,
  getArticleSlugs,
} from "@/shared/api/directus/articles";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { ContentDetailPage } from "@/widgets/content-detail";
import { PageBlocks } from "@/widgets/page-blocks";

type ArticleDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getArticleSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticleDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArticleDetailPageData(slug);

  if (!data) {
    return {};
  }

  return buildPageMetadata(data.item.seo, {
    author: data.item.author?.name,
    canonicalPath: `/articles/${data.item.slug}`,
    fallbackDescription: data.item.description,
    fallbackImage: data.item.image,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    openGraphType: "article",
    publishedTime: data.item.publishedAt,
    variables: {
      AUTHOR: data.item.author?.name,
      TITLE: data.item.title,
      URL: `/articles/${data.item.slug}`,
    },
  });
}

export default async function ArticleDetailRoute({
  params,
}: ArticleDetailRouteProps) {
  const { slug } = await params;
  const data = await getArticleDetailPageData(slug);

  if (!data) {
    notFound();
  }

  return (
    <>
      <ContentDetailPage
        basePath="/articles"
        contentLabel="Статья"
        item={data.item}
        related={data.related}
        relatedTitle="Другие статьи"
      />
      <PageBlocks blocks={data.blocks} />
    </>
  );
}
