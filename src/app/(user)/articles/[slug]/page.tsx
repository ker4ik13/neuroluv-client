import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getArticleDetailPageData,
  getArticleMetadataBySlug,
} from "@/shared/api/directus/articles";
import {
  buildBlogArticleJsonLd,
  buildFaqQuestionsJsonLd,
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { ContentDetailPage } from "@/widgets/content-detail";
import { PageBlocks } from "@/widgets/page-blocks";

export const revalidate = 60;

type ArticleDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: ArticleDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getArticleMetadataBySlug(slug);

  if (!item) {
    return {};
  }

  return buildPageMetadata(item.seo, {
    author: item.author?.name,
    canonicalPath: `/articles/${item.slug}`,
    fallbackDescription: item.description,
    fallbackImage: item.image,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    openGraphType: "article",
    publishedTime: item.publishedAt,
    variables: {
      AUTHOR: item.author?.name,
      TITLE: item.title,
      URL: `/articles/${item.slug}`,
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
      <JsonLd
        data={[
          buildWebPageJsonLd({
            description: data.item.description,
            image: data.item.image,
            title: data.item.title,
            url: data.item.href,
          }),
          buildBlogArticleJsonLd(data.item),
          buildFaqQuestionsJsonLd(data.item.contentBlocks.flatMap(block => block.type === 'faq' ? block.questions : [])),
          buildBreadcrumbJsonLd([
            { name: "Главная", url: "/" },
            { name: "Блог", url: "/articles" },
            { name: data.item.title, url: data.item.href },
          ]),
        ]}
      />
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
