import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getNewsDetailPageData, getNewsSlugs } from "@/shared/api/directus/news";
import { SITE_URL } from "@/shared/config/site";
import { ContentDetailPage } from "@/widgets/content-detail";
import { PageBlocks } from "@/widgets/page-blocks";

type NewsDetailRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const slugs = await getNewsSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: NewsDetailRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getNewsDetailPageData(slug);

  if (!data) {
    return {};
  }

  const image = data.item.image;

  return {
    title: data.item.title,
    description: data.item.description,
    alternates: {
      canonical: `${SITE_URL}/news/${data.item.slug}`,
    },
    openGraph: {
      title: data.item.title,
      description: data.item.description,
      type: "article",
      url: `${SITE_URL}/news/${data.item.slug}`,
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
