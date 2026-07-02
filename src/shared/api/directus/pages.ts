import type { NavigationIcon } from "@/entities/navigation";
import type {
  Page,
  PageBlock,
  PageHeroBlock,
  PageHeroButton,
  PageImage,
} from "@/entities/page";
import { directusRequest } from "@/shared/api/directus/client";
import { DIRECTUS_URL } from "@/shared/config/directus";

type DirectusIcon = {
  title: string | null;
  code: string | null;
  library: string | null;
  is_active: boolean | null;
};

type DirectusFile = {
  id: string;
  title: string | null;
  type: string | null;
  width: number | null;
  height: number | null;
};

type DirectusHeroButton = {
  id: number;
  label: string | null;
  url: string | null;
  target: "_self" | "_blank" | null;
  variant: "primary" | "secondary" | null;
  icon: DirectusIcon | null;
  is_active: boolean | null;
};

type DirectusHeroButtonJunction = {
  sort: number | null;
  hero_buttons_id: DirectusHeroButton | number | null;
};

type DirectusHeroBlock = {
  id: number;
  theme: "dark" | "light" | null;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  link: string | null;
  image: DirectusFile | string | null;
  is_active: boolean | null;
  buttons?: DirectusHeroButtonJunction[];
};

type DirectusPageBlock = {
  id: number;
  sort: number | null;
  collection: string | null;
  item: DirectusHeroBlock | number | string | null;
};

type DirectusPage = {
  id: number;
  title: string | null;
  slug: string | null;
  blocks?: DirectusPageBlock[];
};

const PAGE_FIELDS = [
  "id",
  "title",
  "slug",
  "blocks.id",
  "blocks.sort",
  "blocks.collection",
  "blocks.item.*",
  "blocks.item.image.id",
  "blocks.item.image.title",
  "blocks.item.image.type",
  "blocks.item.image.width",
  "blocks.item.image.height",
  "blocks.item.buttons.sort",
  "blocks.item.buttons.hero_buttons_id.id",
  "blocks.item.buttons.hero_buttons_id.label",
  "blocks.item.buttons.hero_buttons_id.url",
  "blocks.item.buttons.hero_buttons_id.target",
  "blocks.item.buttons.hero_buttons_id.variant",
  "blocks.item.buttons.hero_buttons_id.is_active",
  "blocks.item.buttons.hero_buttons_id.icon.title",
  "blocks.item.buttons.hero_buttons_id.icon.code",
  "blocks.item.buttons.hero_buttons_id.icon.library",
  "blocks.item.buttons.hero_buttons_id.icon.is_active",
].join(",");

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const params = new URLSearchParams({
    fields: PAGE_FIELDS,
    limit: "1",
  });

  params.set("filter[slug][_eq]", slug);

  const pages = await directusRequest<DirectusPage[]>(
    `/items/pages?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizePage(pages[0] || null);
}

export async function getHomePage(): Promise<Page | null> {
  const homePage = await getPageBySlug("/");

  if (homePage) {
    return homePage;
  }

  const params = new URLSearchParams({
    fields: PAGE_FIELDS,
    limit: "1",
    sort: "sort,id",
  });

  const pages = await directusRequest<DirectusPage[]>(
    `/items/pages?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizePage(pages[0] || null);
}

function normalizePage(page: DirectusPage | null): Page | null {
  if (!page?.slug) {
    return null;
  }

  return {
    id: page.id,
    title: page.title || "",
    slug: page.slug,
    blocks: normalizeBlocks(page.blocks || []),
  };
}

function normalizeBlocks(blocks: DirectusPageBlock[]): PageBlock[] {
  return blocks
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map(normalizeBlock)
    .filter((block): block is PageBlock => block !== null);
}

function normalizeBlock(block: DirectusPageBlock): PageBlock | null {
  if (block.collection === "block_hero") {
    return normalizeHeroBlock(block.item);
  }

  return null;
}

function normalizeHeroBlock(
  item: DirectusPageBlock["item"],
): PageHeroBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "hero",
    theme: item.theme || "dark",
    eyebrow: item.eyebrow,
    title: item.title,
    description: item.description || "",
    link: item.link,
    image: normalizeImage(item.image, "Hero"),
    buttons: normalizeHeroButtons(item.buttons || []),
  };
}

function normalizeHeroButtons(
  buttons: DirectusHeroButtonJunction[],
): PageHeroButton[] {
  return buttons
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((button) => button.hero_buttons_id)
    .filter(isDirectusHeroButton)
    .filter((button) => Boolean(button.label && button.url))
    .map((button) => ({
      id: button.id,
      label: button.label || "",
      href: button.url || "/",
      target: button.target || "_self",
      variant: button.variant || "primary",
      icon: normalizeIcon(button.icon),
    }));
}

function isDirectusHeroButton(
  button: DirectusHeroButton | number | null,
): button is DirectusHeroButton {
  return typeof button === "object" && button !== null && button.is_active !== false;
}

function normalizeImage(
  image: DirectusFile | string | null,
  fallbackTitle: string,
): PageImage | null {
  if (!image) {
    return null;
  }

  const file =
    typeof image === "string"
      ? {
          id: image,
          title: fallbackTitle,
          type: null,
          width: null,
          height: null,
        }
      : image;

  return {
    id: file.id,
    title: file.title || fallbackTitle,
    url: `${DIRECTUS_URL}/assets/${file.id}`,
    type: file.type,
    width: file.width,
    height: file.height,
  };
}

function normalizeIcon(icon: DirectusIcon | null): NavigationIcon | null {
  if (!icon?.code || icon.is_active === false) {
    return null;
  }

  return {
    title: icon.title || icon.code,
    code: icon.code,
    library: icon.library || "custom",
  };
}
