import type { Metadata } from "next";

import { getHomePage } from "@/shared/api/directus/pages";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/");

  return buildPageMetadata(seo, {
    canonicalPath: "/",
    fallbackTitle: "{SITE_NAME}",
    variables: {
      TITLE: "Главная",
      URL: "/",
    },
  });
}

export default async function Home() {
  const page = await getHomePage();

  if (!page) {
    return null;
  }

  return (
    <>
      <JsonLd
        data={buildPageJsonLd(page, {
          title: "Главная",
          url: "/",
        })}
      />
      <PageBlocks blocks={page.blocks} />
    </>
  );
}
