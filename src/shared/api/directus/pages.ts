import type { NavigationIcon } from "@/entities/navigation";
import type {
  Page,
  PageAboutBlock,
  PageAboutCard,
  PageBigCtaBlock,
  PageCtaItem,
  PageBlock,
  PageFaqBlock,
  PageFaqItem,
  PageHeroBlock,
  PageHeroButton,
  PageImage,
  PageMiniCtaBlock,
  PagePromptCard,
  PagePromptsBlock,
  PageServiceCard,
  PageServicesBlock,
  PageStepItem,
  PageStepsBlock,
  PageTableBlock,
  PageTableColumn,
  PageTableRow,
  PageTaskGridBlock,
  PageTaskGridItem,
  PageTaskExamplesBlock,
  PageTaskExamplesCard,
  PageUseCaseCard,
  PageUseCasesBlock,
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
  variant: "primary" | "secondary" | "outline" | null;
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

type DirectusFaqQuestion = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
};

type DirectusFaqQuestionJunction = {
  id: number;
  sort: number | null;
  faq_questions_id: DirectusFaqQuestion | number | null;
};

type DirectusFaqBlock = {
  id: number;
  title: string | null;
  description: string | null;
  link: string | null;
  icon: DirectusIcon | null;
  is_active: boolean | null;
  questions?: DirectusFaqQuestionJunction[];
};

type DirectusUseCaseTask = {
  id: number;
  sort: number | null;
  title: string | null;
  is_active: boolean | null;
};

type DirectusUseCaseCard = {
  id: number;
  sort: number | null;
  title: string | null;
  is_active: boolean | null;
  tasks?: DirectusUseCaseTask[];
};

type DirectusUseCasesBlock = {
  id: number;
  title: string | null;
  description: string | null;
  card_title: string | null;
  card_description: string | null;
  card_image: DirectusFile | string | null;
  advice_icon: DirectusIcon | null;
  advice_title: string | null;
  advice_description: string | null;
  is_active: boolean | null;
  buttons?: DirectusHeroButtonJunction[];
  use_cases?: DirectusUseCaseCard[];
};

type DirectusStepItem = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
};

type DirectusStepsBlock = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  steps?: DirectusStepItem[];
};

type DirectusTableColumn = {
  id: number;
  sort: number | null;
  title: string | null;
  is_selected: boolean | null;
  is_active: boolean | null;
};

type DirectusTableValue = {
  id: number;
  sort: number | null;
  value: string | null;
  is_active: boolean | null;
  column_id: DirectusTableColumn | number | null;
};

type DirectusTableRow = {
  id: number;
  sort: number | null;
  is_active: boolean | null;
  values?: DirectusTableValue[];
};

type DirectusDataTable = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  columns?: DirectusTableColumn[];
  rows?: DirectusTableRow[];
};

type DirectusTableBlock = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  table: DirectusDataTable | number | null;
};

type DirectusPromptImageJunction = {
  sort: number | null;
  directus_files_id: DirectusFile | string | null;
};

type DirectusPromptNeuralNetwork = {
  name: string | null;
};

type DirectusPrompt = {
  id: number;
  title: string | null;
  slug: string | null;
  description: string | null;
  format: string | null;
  difficulty: string | null;
  views_count: number | null;
  status: "published" | "draft" | "archived" | string | null;
  neural_network: DirectusPromptNeuralNetwork | number | null;
  images?: DirectusPromptImageJunction[];
};

type DirectusPromptJunction = {
  id?: number;
  sort: number | null;
  prompts_id: DirectusPrompt | number | null;
};

type DirectusPromptsBlock = {
  id: number;
  title: string | null;
  description: string | null;
  link: string | null;
  is_active: boolean | null;
  prompts?: DirectusPromptJunction[];
};

type DirectusTaskGridItem = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  icon: DirectusIcon | null;
  is_active: boolean | null;
};

type DirectusTaskGridBlock = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  tasks?: DirectusTaskGridItem[];
};

type DirectusBigCtaAdvantage = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  icon: DirectusIcon | null;
  is_active: boolean | null;
};

type DirectusBigCtaStep = {
  id: number;
  sort: number | null;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
};

type DirectusBigCtaBlock = {
  id: number;
  title: string | null;
  description: string | null;
  image: DirectusFile | string | null;
  is_active: boolean | null;
  buttons?: DirectusHeroButtonJunction[];
  advantages?: DirectusBigCtaAdvantage[];
  steps?: DirectusBigCtaStep[];
};

type DirectusMiniCtaBlock = {
  id: number;
  title: string | null;
  description: string | null;
  image: DirectusFile | string | null;
  is_active: boolean | null;
  buttons?: DirectusHeroButtonJunction[];
};

export type DirectusPageBlock = {
  id: number;
  sort: number | null;
  collection: string | null;
  item:
    | DirectusHeroBlock
    | DirectusAboutBlock
    | DirectusTaskExamplesBlock
    | DirectusServicesBlock
    | DirectusFaqBlock
    | DirectusUseCasesBlock
    | DirectusStepsBlock
    | DirectusTableBlock
    | DirectusPromptsBlock
    | DirectusTaskGridBlock
    | DirectusBigCtaBlock
    | DirectusMiniCtaBlock
    | number
    | string
    | null;
};

type DirectusPage = {
  id: number;
  title: string | null;
  slug: string | null;
  h1: string | null;
  blocks?: DirectusPageBlock[];
};

export const PAGE_FIELDS = [
  "id",
  "title",
  "slug",
  "h1",
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
  "blocks.item:block_faq.id",
  "blocks.item:block_faq.title",
  "blocks.item:block_faq.description",
  "blocks.item:block_faq.link",
  "blocks.item:block_faq.is_active",
  "blocks.item:block_faq.icon.title",
  "blocks.item:block_faq.icon.code",
  "blocks.item:block_faq.icon.library",
  "blocks.item:block_faq.icon.is_active",
  "blocks.item:block_faq.questions.id",
  "blocks.item:block_faq.questions.sort",
  "blocks.item:block_faq.questions.faq_questions_id.id",
  "blocks.item:block_faq.questions.faq_questions_id.title",
  "blocks.item:block_faq.questions.faq_questions_id.description",
  "blocks.item:block_faq.questions.faq_questions_id.is_active",
  "blocks.item:block_use_cases.id",
  "blocks.item:block_use_cases.title",
  "blocks.item:block_use_cases.description",
  "blocks.item:block_use_cases.card_title",
  "blocks.item:block_use_cases.card_description",
  "blocks.item:block_use_cases.card_image.id",
  "blocks.item:block_use_cases.card_image.title",
  "blocks.item:block_use_cases.card_image.type",
  "blocks.item:block_use_cases.card_image.width",
  "blocks.item:block_use_cases.card_image.height",
  "blocks.item:block_use_cases.advice_icon.title",
  "blocks.item:block_use_cases.advice_icon.code",
  "blocks.item:block_use_cases.advice_icon.library",
  "blocks.item:block_use_cases.advice_icon.is_active",
  "blocks.item:block_use_cases.advice_title",
  "blocks.item:block_use_cases.advice_description",
  "blocks.item:block_use_cases.is_active",
  "blocks.item:block_use_cases.buttons.sort",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.id",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.label",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.url",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.target",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.variant",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.is_active",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.icon.title",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.icon.code",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.icon.library",
  "blocks.item:block_use_cases.buttons.hero_buttons_id.icon.is_active",
  "blocks.item:block_use_cases.use_cases.id",
  "blocks.item:block_use_cases.use_cases.sort",
  "blocks.item:block_use_cases.use_cases.title",
  "blocks.item:block_use_cases.use_cases.is_active",
  "blocks.item:block_use_cases.use_cases.tasks.id",
  "blocks.item:block_use_cases.use_cases.tasks.sort",
  "blocks.item:block_use_cases.use_cases.tasks.title",
  "blocks.item:block_use_cases.use_cases.tasks.is_active",
  "blocks.item:block_steps.id",
  "blocks.item:block_steps.title",
  "blocks.item:block_steps.description",
  "blocks.item:block_steps.is_active",
  "blocks.item:block_steps.steps.id",
  "blocks.item:block_steps.steps.sort",
  "blocks.item:block_steps.steps.title",
  "blocks.item:block_steps.steps.description",
  "blocks.item:block_steps.steps.is_active",
  "blocks.item:block_table.id",
  "blocks.item:block_table.title",
  "blocks.item:block_table.description",
  "blocks.item:block_table.is_active",
  "blocks.item:block_table.table.id",
  "blocks.item:block_table.table.title",
  "blocks.item:block_table.table.description",
  "blocks.item:block_table.table.is_active",
  "blocks.item:block_table.table.columns.id",
  "blocks.item:block_table.table.columns.sort",
  "blocks.item:block_table.table.columns.title",
  "blocks.item:block_table.table.columns.is_selected",
  "blocks.item:block_table.table.columns.is_active",
  "blocks.item:block_table.table.rows.id",
  "blocks.item:block_table.table.rows.sort",
  "blocks.item:block_table.table.rows.is_active",
  "blocks.item:block_table.table.rows.values.id",
  "blocks.item:block_table.table.rows.values.sort",
  "blocks.item:block_table.table.rows.values.value",
  "blocks.item:block_table.table.rows.values.is_active",
  "blocks.item:block_table.table.rows.values.column_id.id",
  "blocks.item:block_table.table.rows.values.column_id.sort",
  "blocks.item:block_table.table.rows.values.column_id.title",
  "blocks.item:block_table.table.rows.values.column_id.is_selected",
  "blocks.item:block_table.table.rows.values.column_id.is_active",
  "blocks.item:block_prompts.id",
  "blocks.item:block_prompts.title",
  "blocks.item:block_prompts.description",
  "blocks.item:block_prompts.link",
  "blocks.item:block_prompts.is_active",
  "blocks.item:block_prompts.prompts.id",
  "blocks.item:block_prompts.prompts.sort",
  "blocks.item:block_prompts.prompts.prompts_id.id",
  "blocks.item:block_prompts.prompts.prompts_id.title",
  "blocks.item:block_prompts.prompts.prompts_id.slug",
  "blocks.item:block_prompts.prompts.prompts_id.description",
  "blocks.item:block_prompts.prompts.prompts_id.format",
  "blocks.item:block_prompts.prompts.prompts_id.difficulty",
  "blocks.item:block_prompts.prompts.prompts_id.views_count",
  "blocks.item:block_prompts.prompts.prompts_id.status",
  "blocks.item:block_prompts.prompts.prompts_id.neural_network.name",
  "blocks.item:block_prompts.prompts.prompts_id.images.sort",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.id",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.title",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.type",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.width",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.height",
  "blocks.item:block_task_grid.id",
  "blocks.item:block_task_grid.title",
  "blocks.item:block_task_grid.description",
  "blocks.item:block_task_grid.is_active",
  "blocks.item:block_task_grid.tasks.id",
  "blocks.item:block_task_grid.tasks.sort",
  "blocks.item:block_task_grid.tasks.title",
  "blocks.item:block_task_grid.tasks.description",
  "blocks.item:block_task_grid.tasks.is_active",
  "blocks.item:block_task_grid.tasks.icon.title",
  "blocks.item:block_task_grid.tasks.icon.code",
  "blocks.item:block_task_grid.tasks.icon.library",
  "blocks.item:block_task_grid.tasks.icon.is_active",
  "blocks.item:block_big_cta.id",
  "blocks.item:block_big_cta.title",
  "blocks.item:block_big_cta.description",
  "blocks.item:block_big_cta.is_active",
  "blocks.item:block_big_cta.image.id",
  "blocks.item:block_big_cta.image.title",
  "blocks.item:block_big_cta.image.type",
  "blocks.item:block_big_cta.image.width",
  "blocks.item:block_big_cta.image.height",
  "blocks.item:block_big_cta.buttons.sort",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.id",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.label",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.url",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.target",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.variant",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.is_active",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.icon.title",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.icon.code",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.icon.library",
  "blocks.item:block_big_cta.buttons.hero_buttons_id.icon.is_active",
  "blocks.item:block_big_cta.advantages.id",
  "blocks.item:block_big_cta.advantages.sort",
  "blocks.item:block_big_cta.advantages.title",
  "blocks.item:block_big_cta.advantages.description",
  "blocks.item:block_big_cta.advantages.is_active",
  "blocks.item:block_big_cta.advantages.icon.title",
  "blocks.item:block_big_cta.advantages.icon.code",
  "blocks.item:block_big_cta.advantages.icon.library",
  "blocks.item:block_big_cta.advantages.icon.is_active",
  "blocks.item:block_big_cta.steps.id",
  "blocks.item:block_big_cta.steps.sort",
  "blocks.item:block_big_cta.steps.title",
  "blocks.item:block_big_cta.steps.description",
  "blocks.item:block_big_cta.steps.is_active",
  "blocks.item:block_mini_cta.id",
  "blocks.item:block_mini_cta.title",
  "blocks.item:block_mini_cta.description",
  "blocks.item:block_mini_cta.is_active",
  "blocks.item:block_mini_cta.image.id",
  "blocks.item:block_mini_cta.image.title",
  "blocks.item:block_mini_cta.image.type",
  "blocks.item:block_mini_cta.image.width",
  "blocks.item:block_mini_cta.image.height",
  "blocks.item:block_mini_cta.buttons.sort",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.id",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.label",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.url",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.target",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.variant",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.is_active",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.icon.title",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.icon.code",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.icon.library",
  "blocks.item:block_mini_cta.buttons.hero_buttons_id.icon.is_active",
].join(",");

export const PAGE_BLOCK_FIELDS = PAGE_FIELDS.split(",")
  .filter((field) => !["id", "title", "slug", "h1"].includes(field))
  .join(",");

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const params = new URLSearchParams({
    fields: PAGE_FIELDS,
    limit: "1",
  });

  params.set("filter[status][_eq]", "published");
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

  params.set("filter[status][_eq]", "published");

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
    h1: page.h1 || null,
    blocks: normalizePageBlocks(page.blocks || []),
  };
}

export function normalizePageBlocks(blocks: DirectusPageBlock[]): PageBlock[] {
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

  if (block.collection === "block_faq") {
    return normalizeFaqBlock(block.item as DirectusFaqBlock | number | string | null);
  }

  if (block.collection === "block_use_cases") {
    return normalizeUseCasesBlock(
      block.item as DirectusUseCasesBlock | number | string | null,
    );
  }

  if (block.collection === "block_steps") {
    return normalizeStepsBlock(
      block.item as DirectusStepsBlock | number | string | null,
    );
  }

  if (block.collection === "block_table") {
    return normalizeTableBlock(
      block.item as DirectusTableBlock | number | string | null,
    );
  }

  if (block.collection === "block_prompts") {
    return normalizePromptsBlock(
      block.item as DirectusPromptsBlock | number | string | null,
    );
  }

  if (block.collection === "block_task_grid") {
    return normalizeTaskGridBlock(
      block.item as DirectusTaskGridBlock | number | string | null,
    );
  }

  if (block.collection === "block_big_cta") {
    return normalizeBigCtaBlock(
      block.item as DirectusBigCtaBlock | number | string | null,
    );
  }

  if (block.collection === "block_mini_cta") {
    return normalizeMiniCtaBlock(
      block.item as DirectusMiniCtaBlock | number | string | null,
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

function normalizeFaqBlock(
  item: DirectusFaqBlock | number | string | null,
): PageFaqBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "faq",
    title: item.title,
    description: item.description || "",
    link: item.link || null,
    icon: normalizeIcon(item.icon),
    questions: normalizeFaqQuestions(item.questions || []),
  };
}

function normalizeFaqQuestions(
  questions: DirectusFaqQuestionJunction[],
): PageFaqItem[] {
  return questions
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((question) => question.faq_questions_id)
    .filter(isActiveFaqQuestion)
    .filter((question) => Boolean(question.title))
    .map((question) => ({
      id: question.id,
      title: question.title || "",
      answer: question.description || "",
    }));
}

function isActiveFaqQuestion(
  question: DirectusFaqQuestion | number | null,
): question is DirectusFaqQuestion {
  return typeof question === "object" && question !== null && question.is_active !== false;
}

function normalizeUseCasesBlock(
  item: DirectusUseCasesBlock | number | string | null,
): PageUseCasesBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "useCases",
    title: item.title,
    description: item.description || "",
    cardTitle: item.card_title || item.title,
    cardDescription: item.card_description || item.description || "",
    cardImage: normalizeImage(item.card_image, "Для чего ИИ"),
    adviceIcon: normalizeIcon(item.advice_icon),
    adviceTitle: item.advice_title,
    adviceDescription: item.advice_description,
    buttons: normalizeHeroButtons(item.buttons || []),
    useCases: normalizeUseCaseCards(item.use_cases || []),
  };
}

function normalizeUseCaseCards(cards: DirectusUseCaseCard[]): PageUseCaseCard[] {
  return cards
    .filter((card) => card.is_active !== false && card.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((card) => ({
      id: card.id,
      title: card.title || "",
      tasks: normalizeUseCaseTasks(card.tasks || []),
    }));
}

function normalizeUseCaseTasks(tasks: DirectusUseCaseTask[]): string[] {
  return tasks
    .filter((task) => task.is_active !== false && task.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((task) => task.title || "");
}

function normalizeStepsBlock(
  item: DirectusStepsBlock | number | string | null,
): PageStepsBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "steps",
    title: item.title,
    description: item.description || "",
    steps: normalizeSteps(item.steps || []),
  };
}

function normalizeSteps(steps: DirectusStepItem[]): PageStepItem[] {
  return steps
    .filter((step) => step.is_active !== false && step.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((step) => ({
      id: step.id,
      title: step.title || "",
      description: step.description || "",
    }));
}

function normalizeTableBlock(
  item: DirectusTableBlock | number | string | null,
): PageTableBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  if (!item.table || typeof item.table !== "object" || item.table.is_active === false) {
    return null;
  }

  const columns = normalizeTableColumns(item.table.columns || []);

  return {
    id: item.id,
    type: "table",
    title: item.title,
    description: item.description || item.table.description || "",
    columns,
    rows: normalizeTableRows(item.table.rows || [], columns),
  };
}

function normalizeTableColumns(columns: DirectusTableColumn[]): PageTableColumn[] {
  return columns
    .filter((column) => column.is_active !== false && column.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((column) => ({
      id: column.id,
      title: column.title || "",
      isSelected: Boolean(column.is_selected),
    }));
}

function normalizeTableRows(
  rows: DirectusTableRow[],
  columns: PageTableColumn[],
): PageTableRow[] {
  return rows
    .filter((row) => row.is_active !== false)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((row) => {
      const values = new Map<number, string>();

      (row.values || [])
        .filter((value) => value.is_active !== false)
        .forEach((value) => {
          const columnId =
            typeof value.column_id === "object" && value.column_id !== null
              ? value.column_id.id
              : value.column_id;

          if (columnId) {
            values.set(columnId, value.value || "");
          }
        });

      return {
        id: row.id,
        cells: columns.map((column) => values.get(column.id) || ""),
      };
    });
}

function normalizePromptsBlock(
  item: DirectusPromptsBlock | number | string | null,
): PagePromptsBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "prompts",
    title: item.title,
    description: item.description || "",
    link: item.link || null,
    prompts: normalizePromptCards(item.prompts || []),
  };
}

function normalizePromptCards(prompts: DirectusPromptJunction[]): PagePromptCard[] {
  return prompts
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((prompt) => prompt.prompts_id)
    .filter(isPublishedDirectusPrompt)
    .filter((prompt) => Boolean(prompt.title && prompt.slug))
    .map((prompt) => ({
      id: prompt.id,
      title: prompt.title || "",
      description: prompt.description || "",
      href: `/prompts/${prompt.slug || ""}`,
      format: prompt.format,
      difficulty: prompt.difficulty,
      viewsCount: prompt.views_count || 0,
      neuralNetwork:
        typeof prompt.neural_network === "object" && prompt.neural_network !== null
          ? prompt.neural_network.name
          : null,
      image: normalizePromptImage(prompt.images || []),
    }));
}

function isPublishedDirectusPrompt(
  prompt: DirectusPrompt | number | null,
): prompt is DirectusPrompt {
  return (
    typeof prompt === "object" &&
    prompt !== null &&
    (prompt.status === "published" || prompt.status === null)
  );
}

function normalizePromptImage(images: DirectusPromptImageJunction[]): PageImage | null {
  const image = [...images]
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((item) => item.directus_files_id)
    .find(Boolean);

  return normalizeImage(image || null, "Промпт");
}

function normalizeTaskGridBlock(
  item: DirectusTaskGridBlock | number | string | null,
): PageTaskGridBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "taskGrid",
    title: item.title,
    description: item.description || "",
    tasks: normalizeTaskGridItems(item.tasks || []),
  };
}

function normalizeTaskGridItems(tasks: DirectusTaskGridItem[]): PageTaskGridItem[] {
  return tasks
    .filter((task) => task.is_active !== false && task.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((task) => ({
      id: task.id,
      title: task.title || "",
      description: task.description || "",
      icon: normalizeIcon(task.icon),
    }));
}

function normalizeBigCtaBlock(
  item: DirectusBigCtaBlock | number | string | null,
): PageBigCtaBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "bigCta",
    title: item.title,
    description: item.description || "",
    image: normalizeImage(item.image, "CTA"),
    buttons: normalizeHeroButtons(item.buttons || []),
    advantages: normalizeCtaItems(item.advantages || []),
    steps: normalizeCtaSteps(item.steps || []),
  };
}

function normalizeCtaItems(items: DirectusBigCtaAdvantage[]): PageCtaItem[] {
  return items
    .filter((item) => item.is_active !== false && item.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((item) => ({
      id: item.id,
      title: item.title || "",
      description: item.description || "",
      icon: normalizeIcon(item.icon),
    }));
}

function normalizeCtaSteps(
  steps: DirectusBigCtaStep[],
): Omit<PageCtaItem, "icon">[] {
  return steps
    .filter((step) => step.is_active !== false && step.title)
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((step) => ({
      id: step.id,
      title: step.title || "",
      description: step.description || "",
    }));
}

function normalizeMiniCtaBlock(
  item: DirectusMiniCtaBlock | number | string | null,
): PageMiniCtaBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "miniCta",
    title: item.title,
    description: item.description || "",
    image: normalizeImage(item.image, "CTA"),
    buttons: normalizeHeroButtons(item.buttons || []),
  };
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
