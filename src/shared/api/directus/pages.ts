import type { NavigationIcon } from "@/entities/navigation";
import type {
  Page,
  PageAboutBlock,
  PageAboutCard,
  PageBlock,
  PageHeroBlock,
  PageHeroButton,
  PageImage,
  PageServiceCard,
  PageServicesBlock,
  PageTaskExamplesBlock,
  PageTaskExamplesCard,
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

type DirectusAboutCard = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  icon: DirectusIcon | null;
  is_active: boolean | null;
};

type DirectusAboutBlock = {
  id: number;
  title: string | null;
  description: string | null;
  advantage_title: string | null;
  advantage_description: string | null;
  advantage_image: DirectusFile | string | null;
  is_active: boolean | null;
  cards?: DirectusAboutCard[];
};

type DirectusTaskExamplesCard = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  link: string | null;
  is_selected: boolean | null;
  is_active: boolean | null;
  icon: DirectusIcon | null;
};

type DirectusTaskExamplesBlock = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  cards?: DirectusTaskExamplesCard[];
};

type DirectusServiceAdvantage = {
  id: number;
  sort: number | null;
  title: string | null;
  is_active: boolean | null;
};

type DirectusService = {
  id: number;
  title: string | null;
  description: string | null;
  slug: string | null;
  status: "published" | "draft" | "archived" | string | null;
  is_popular: boolean | null;
  card_icon: DirectusIcon | null;
  card_title: string | null;
  card_description: string | null;
  card_advantages?: DirectusServiceAdvantage[];
};

type DirectusServiceJunction = {
  id: number;
  sort: number | null;
  services_id: DirectusService | number | null;
};

type DirectusServicesBlock = {
  id: number;
  title: string | null;
  description: string | null;
  all_services_link: string | null;
  is_active: boolean | null;
  services?: DirectusServiceJunction[];
};

type DirectusPageBlock = {
  id: number;
  sort: number | null;
  collection: string | null;
  item:
    | DirectusHeroBlock
    | DirectusAboutBlock
    | DirectusTaskExamplesBlock
    | DirectusServicesBlock
    | number
    | string
    | null;
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
  "blocks.item:block_hero.id",
  "blocks.item:block_hero.theme",
  "blocks.item:block_hero.eyebrow",
  "blocks.item:block_hero.title",
  "blocks.item:block_hero.description",
  "blocks.item:block_hero.link",
  "blocks.item:block_hero.is_active",
  "blocks.item:block_hero.image.id",
  "blocks.item:block_hero.image.title",
  "blocks.item:block_hero.image.type",
  "blocks.item:block_hero.image.width",
  "blocks.item:block_hero.image.height",
  "blocks.item:block_hero.buttons.sort",
  "blocks.item:block_hero.buttons.hero_buttons_id.id",
  "blocks.item:block_hero.buttons.hero_buttons_id.label",
  "blocks.item:block_hero.buttons.hero_buttons_id.url",
  "blocks.item:block_hero.buttons.hero_buttons_id.target",
  "blocks.item:block_hero.buttons.hero_buttons_id.variant",
  "blocks.item:block_hero.buttons.hero_buttons_id.is_active",
  "blocks.item:block_hero.buttons.hero_buttons_id.icon.title",
  "blocks.item:block_hero.buttons.hero_buttons_id.icon.code",
  "blocks.item:block_hero.buttons.hero_buttons_id.icon.library",
  "blocks.item:block_hero.buttons.hero_buttons_id.icon.is_active",
  "blocks.item:block_about.id",
  "blocks.item:block_about.title",
  "blocks.item:block_about.description",
  "blocks.item:block_about.advantage_title",
  "blocks.item:block_about.advantage_description",
  "blocks.item:block_about.advantage_image.id",
  "blocks.item:block_about.advantage_image.title",
  "blocks.item:block_about.advantage_image.type",
  "blocks.item:block_about.advantage_image.width",
  "blocks.item:block_about.advantage_image.height",
  "blocks.item:block_about.is_active",
  "blocks.item:block_about.cards.id",
  "blocks.item:block_about.cards.sort",
  "blocks.item:block_about.cards.title",
  "blocks.item:block_about.cards.description",
  "blocks.item:block_about.cards.is_active",
  "blocks.item:block_about.cards.icon.title",
  "blocks.item:block_about.cards.icon.code",
  "blocks.item:block_about.cards.icon.library",
  "blocks.item:block_about.cards.icon.is_active",
  "blocks.item:block_task_examples.id",
  "blocks.item:block_task_examples.title",
  "blocks.item:block_task_examples.description",
  "blocks.item:block_task_examples.is_active",
  "blocks.item:block_task_examples.cards.id",
  "blocks.item:block_task_examples.cards.sort",
  "blocks.item:block_task_examples.cards.title",
  "blocks.item:block_task_examples.cards.description",
  "blocks.item:block_task_examples.cards.link",
  "blocks.item:block_task_examples.cards.is_selected",
  "blocks.item:block_task_examples.cards.is_active",
  "blocks.item:block_task_examples.cards.icon.title",
  "blocks.item:block_task_examples.cards.icon.code",
  "blocks.item:block_task_examples.cards.icon.library",
  "blocks.item:block_task_examples.cards.icon.is_active",
  "blocks.item:block_services.id",
  "blocks.item:block_services.title",
  "blocks.item:block_services.description",
  "blocks.item:block_services.all_services_link",
  "blocks.item:block_services.is_active",
  "blocks.item:block_services.services.id",
  "blocks.item:block_services.services.sort",
  "blocks.item:block_services.services.services_id.id",
  "blocks.item:block_services.services.services_id.title",
  "blocks.item:block_services.services.services_id.description",
  "blocks.item:block_services.services.services_id.slug",
  "blocks.item:block_services.services.services_id.status",
  "blocks.item:block_services.services.services_id.is_popular",
  "blocks.item:block_services.services.services_id.card_title",
  "blocks.item:block_services.services.services_id.card_description",
  "blocks.item:block_services.services.services_id.card_icon.title",
  "blocks.item:block_services.services.services_id.card_icon.code",
  "blocks.item:block_services.services.services_id.card_icon.library",
  "blocks.item:block_services.services.services_id.card_icon.is_active",
  "blocks.item:block_services.services.services_id.card_advantages.id",
  "blocks.item:block_services.services.services_id.card_advantages.sort",
  "blocks.item:block_services.services.services_id.card_advantages.title",
  "blocks.item:block_services.services.services_id.card_advantages.is_active",
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
    return normalizeHeroBlock(block.item as DirectusHeroBlock | number | string | null);
  }

  if (block.collection === "block_about") {
    return normalizeAboutBlock(block.item as DirectusAboutBlock | number | string | null);
  }

  if (block.collection === "block_task_examples") {
    return normalizeTaskExamplesBlock(
      block.item as DirectusTaskExamplesBlock | number | string | null,
    );
  }

  if (block.collection === "block_services") {
    return normalizeServicesBlock(
      block.item as DirectusServicesBlock | number | string | null,
    );
  }

  return null;
}

function normalizeHeroBlock(
  item: DirectusHeroBlock | number | string | null,
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

function normalizeAboutBlock(
  item: DirectusAboutBlock | number | string | null,
): PageAboutBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "about",
    title: item.title,
    description: item.description || "",
    advantageTitle: item.advantage_title || null,
    advantageDescription: item.advantage_description || null,
    advantageImage: normalizeImage(item.advantage_image, "Преимущество"),
    cards: normalizeAboutCards(item.cards || []),
  };
}

function normalizeAboutCards(cards: DirectusAboutCard[]): PageAboutCard[] {
  return cards
    .filter((card) => card.is_active !== false && card.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((card) => ({
      id: card.id,
      title: card.title || "",
      description: card.description || "",
      icon: normalizeIcon(card.icon),
    }));
}

function normalizeTaskExamplesBlock(
  item: DirectusTaskExamplesBlock | number | string | null,
): PageTaskExamplesBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "taskExamples",
    title: item.title,
    description: item.description || "",
    cards: normalizeTaskExamplesCards(item.cards || []),
  };
}

function normalizeTaskExamplesCards(
  cards: DirectusTaskExamplesCard[],
): PageTaskExamplesCard[] {
  return cards
    .filter((card) => card.is_active !== false && card.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((card) => ({
      id: card.id,
      title: card.title || "",
      description: card.description || "",
      href: card.link || null,
      isSelected: Boolean(card.is_selected),
      icon: normalizeIcon(card.icon),
    }));
}

function normalizeServicesBlock(
  item: DirectusServicesBlock | number | string | null,
): PageServicesBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "services",
    title: item.title,
    description: item.description || "",
    allServicesHref: item.all_services_link || null,
    services: normalizeServiceCards(item.services || []),
  };
}

function normalizeServiceCards(services: DirectusServiceJunction[]): PageServiceCard[] {
  return services
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((service) => service.services_id)
    .filter(isPublishedDirectusService)
    .filter((service) => Boolean(service.title && service.slug))
    .map((service) => ({
      id: service.id,
      title: service.card_title || service.title || "",
      description: service.card_description || service.description || "",
      href: service.slug || "/",
      isPopular: Boolean(service.is_popular),
      icon: normalizeIcon(service.card_icon),
      advantages: normalizeServiceAdvantages(service.card_advantages || []),
    }));
}

function isPublishedDirectusService(
  service: DirectusService | number | null,
): service is DirectusService {
  return (
    typeof service === "object" &&
    service !== null &&
    (service.status === "published" || service.status === null)
  );
}

function normalizeServiceAdvantages(
  advantages: DirectusServiceAdvantage[],
): string[] {
  return advantages
    .filter((advantage) => advantage.is_active !== false && advantage.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((advantage) => advantage.title || "");
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
