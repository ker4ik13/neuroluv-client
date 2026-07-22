import type { Metadata } from "next";

import { splitFirstHeroBlock } from "@/entities/page";
import type { PromptsMenuPageData } from "@/entities/prompt";
import { getPageBySlug } from "@/shared/api/directus/pages";
import { getPromptsMenuPageData } from "@/shared/api/directus/prompts";
import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildWebPageJsonLd } from "@/shared/lib/seo/json-ld";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { PageBlocks } from "@/widgets/page-blocks";
import { PromptsMenuPage } from "@/widgets/prompts-menu-page";

const EMPTY_MENU_DATA: PromptsMenuPageData = {
  collections: [],
  collectionsHasMore: false,
  contentKinds: [],
  goals: [],
  neuralNetworks: [],
  tagGroups: [],
};

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/prompts-menu");

  return buildPageMetadata(seo, {
    canonicalPath: "/prompts-menu",
    fallbackTitle: "Каталог промптов | {SITE_NAME}",
    variables: {
      TITLE: "Каталог промптов",
      URL: "/prompts-menu",
    },
  });
}

export default async function PromptsMenuRoute() {
  let data = EMPTY_MENU_DATA;
  const page = await getPageBySlug("/prompts-menu");

  try {
    data = await getPromptsMenuPageData();
  } catch {
    data = EMPTY_MENU_DATA;
  }

  const { hero: heroBlock, remainingBlocks } = splitFirstHeroBlock(page?.blocks || []);
  const title = heroBlock?.title || page?.title || "Каталог промптов";
  const description =
    heroBlock?.description ||
    "Подборки, виды и фильтры промптов для удобного поиска.";

  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd({
          description,
          title,
          type: "CollectionPage",
          url: "/prompts-menu",
        })}
      />
      {heroBlock && <PageBlocks blocks={[heroBlock]} />}
      <PromptsMenuPage data={data} />
      <PageBlocks blocks={remainingBlocks} />
    </>
  );
}
