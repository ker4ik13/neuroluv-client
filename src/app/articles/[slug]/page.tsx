import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getArticleDetailPageData,
  getArticleSlugs,
} from "@/shared/api/directus/articles";
import { SITE_URL } from "@/shared/config/site";
import { ContentDetailPage } from "@/widgets/content-detail";

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

  const image = data.item.image;

  return {
    title: data.item.title,
    description: data.item.description,
    alternates: {
      canonical: `${SITE_URL}/articles/${data.item.slug}`,
    },
    openGraph: {
      title: data.item.title,
      description: data.item.description,
      type: "article",
      url: `${SITE_URL}/articles/${data.item.slug}`,
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

export default async function ArticleDetailRoute({
  params,
}: ArticleDetailRouteProps) {
  const { slug } = await params;
  const data = await getArticleDetailPageData(slug);

  if (!data) {
    notFound();
  }

  return (
    <ContentDetailPage
      basePath="/articles"
      contentLabel="Статья"
      item={data.item}
      related={data.related}
      relatedTitle="Другие статьи"
    />
  );
}
