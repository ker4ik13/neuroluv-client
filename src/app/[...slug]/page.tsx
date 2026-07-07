import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";

type DynamicPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export async function generateMetadata({
  params,
}: DynamicPageProps): Promise<Metadata> {
  const pageSlug = await getPageSlug(params);
  const [seo, page] = await Promise.all([
    getPageSeoBySlug(pageSlug),
    getPageBySlug(pageSlug),
  ]);
  const title = page?.h1 || page?.title || seo?.title || "";

  return buildPageMetadata(seo, {
    canonicalPath: pageSlug,
    fallbackTitle: "{TITLE} | {SITE_NAME}",
    variables: {
      TITLE: title,
      URL: pageSlug,
    },
  });
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const pageSlug = await getPageSlug(params);
  const page = await getPageBySlug(pageSlug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={buildPageJsonLd(page, {
          title: page.title,
          url: pageSlug,
        })}
      />
      <PageBlocks blocks={page.blocks} />
    </>
  );
}

async function getPageSlug(params: DynamicPageProps["params"]): Promise<string> {
  const { slug } = await params;

  return `/${slug.join("/")}`;
}
