import type { NavigationIcon } from "@/entities/navigation";
import type {
  Page,
  PageAboutBlock,
  PageAboutCard,
  PageArticleCard,
  PageArticlesBlock,
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
  PageZeroBlock,
} from "@/entities/page";
import { directusRequest } from "@/shared/api/directus/client";
import {
  buildDirectusContentBlockFields,
  normalizeDirectusContentBlocks,
  type DirectusContentBlock,
} from "@/shared/api/directus/content-blocks";
import { buildDirectusAssetUrl } from "@/shared/config/directus";
import { getDirectusPreviewContext } from "@/shared/lib/preview/directus-preview";

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
  id?: number;
  name: string | null;
};

type DirectusPromptBlockTaxonomyJunction = {
  prompt_tags_id?: { id: number } | number | null;
  prompt_types_id?: { id: number } | number | null;
};

type DirectusPromptBlockReference = {
  id: number;
};

type DirectusPromptBlockAuthor = {
  id: string;
};

type DirectusPrompt = {
  id: number;
  title: string | null;
  slug: string | null;
  description: string | null;
  format: string | null;
  difficulty: string | null;
  autoplay: boolean | null;
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
  selection_mode: string | null;
  is_active: boolean | null;
  limit: number | null;
  author: DirectusPromptBlockAuthor | string | null;
  prompt_collection: DirectusPromptBlockReference | number | null;
  goal: DirectusPromptBlockReference | number | null;
  prompt_type: DirectusPromptBlockReference | number | null;
  neural_network: DirectusPromptBlockReference | number | null;
  difficulty: string | null;
  tags?: DirectusPromptBlockTaxonomyJunction[];
  types?: DirectusPromptBlockTaxonomyJunction[];
  prompts?: DirectusPromptJunction[];
};

type DirectusArticleBlockTaxonomyJunction = {
  sort?: number | null;
  article_tags_id?: { id: number; title?: string | null } | number | null;
  article_topics_id?: { id: number; title?: string | null } | number | null;
};

type DirectusArticleBlockAuthor = {
  id: string;
};

type DirectusArticle = {
  id: number;
  title: string | null;
  slug: string | null;
  description: string | null;
  article_type: string | null;
  created_at: string | null;
  status: "published" | "draft" | "archived" | string | null;
  image: DirectusFile | string | null;
  author: DirectusArticleBlockAuthor | string | null;
  tags?: DirectusArticleBlockTaxonomyJunction[];
  topics?: DirectusArticleBlockTaxonomyJunction[];
};

type DirectusArticleJunction = {
  sort: number | null;
  articles_id: DirectusArticle | number | null;
};

type DirectusArticlesBlock = {
  id: number;
  title: string | null;
  description: string | null;
  link: string | null;
  selection_mode: string | null;
  is_active: boolean | null;
  limit: number | null;
  author: DirectusArticleBlockAuthor | string | null;
  topic: DirectusPromptBlockReference | number | null;
  tags?: DirectusArticleBlockTaxonomyJunction[];
  articles?: DirectusArticleJunction[];
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

type DirectusZeroBlock = {
  id: number;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
  content_blocks?: DirectusContentBlock[];
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
    | DirectusArticlesBlock
    | DirectusTaskGridBlock
    | DirectusBigCtaBlock
    | DirectusMiniCtaBlock
    | DirectusZeroBlock
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

export const PAGE_FIELDS = [
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
  "blocks.item:block_prompts.selection_mode",
  "blocks.item:block_prompts.limit",
  "blocks.item:block_prompts.author.id",
  "blocks.item:block_prompts.prompt_collection.id",
  "blocks.item:block_prompts.goal.id",
  "blocks.item:block_prompts.prompt_type.id",
  "blocks.item:block_prompts.neural_network.id",
  "blocks.item:block_prompts.difficulty",
  "blocks.item:block_prompts.tags.prompt_tags_id.id",
  "blocks.item:block_prompts.types.prompt_types_id.id",
  "blocks.item:block_prompts.is_active",
  "blocks.item:block_prompts.prompts.id",
  "blocks.item:block_prompts.prompts.sort",
  "blocks.item:block_prompts.prompts.prompts_id.id",
  "blocks.item:block_prompts.prompts.prompts_id.title",
  "blocks.item:block_prompts.prompts.prompts_id.slug",
  "blocks.item:block_prompts.prompts.prompts_id.description",
  "blocks.item:block_prompts.prompts.prompts_id.format",
  "blocks.item:block_prompts.prompts.prompts_id.difficulty",
  "blocks.item:block_prompts.prompts.prompts_id.autoplay",
  "blocks.item:block_prompts.prompts.prompts_id.views_count",
  "blocks.item:block_prompts.prompts.prompts_id.status",
  "blocks.item:block_prompts.prompts.prompts_id.neural_network.name",
  "blocks.item:block_prompts.prompts.prompts_id.images.sort",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.id",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.title",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.type",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.width",
  "blocks.item:block_prompts.prompts.prompts_id.images.directus_files_id.height",
  "blocks.item:block_articles.id",
  "blocks.item:block_articles.title",
  "blocks.item:block_articles.description",
  "blocks.item:block_articles.link",
  "blocks.item:block_articles.selection_mode",
  "blocks.item:block_articles.limit",
  "blocks.item:block_articles.author.id",
  "blocks.item:block_articles.topic.id",
  "blocks.item:block_articles.tags.article_tags_id.id",
  "blocks.item:block_articles.is_active",
  "blocks.item:block_articles.articles.id",
  "blocks.item:block_articles.articles.sort",
  "blocks.item:block_articles.articles.articles_id.id",
  "blocks.item:block_articles.articles.articles_id.title",
  "blocks.item:block_articles.articles.articles_id.slug",
  "blocks.item:block_articles.articles.articles_id.description",
  "blocks.item:block_articles.articles.articles_id.article_type",
  "blocks.item:block_articles.articles.articles_id.status",
  "blocks.item:block_articles.articles.articles_id.image.id",
  "blocks.item:block_articles.articles.articles_id.image.title",
  "blocks.item:block_articles.articles.articles_id.image.type",
  "blocks.item:block_articles.articles.articles_id.image.width",
  "blocks.item:block_articles.articles.articles_id.image.height",
  "blocks.item:block_articles.articles.articles_id.topics.sort",
  "blocks.item:block_articles.articles.articles_id.topics.article_topics_id.id",
  "blocks.item:block_articles.articles.articles_id.topics.article_topics_id.title",
  "blocks.item:block_articles.articles.articles_id.tags.sort",
  "blocks.item:block_articles.articles.articles_id.tags.article_tags_id.id",
  "blocks.item:block_articles.articles.articles_id.tags.article_tags_id.title",
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
  "blocks.item:block_zero.id",
  "blocks.item:block_zero.title",
  "blocks.item:block_zero.description",
  "blocks.item:block_zero.is_active",
].join(",");

const ZERO_BLOCK_FIELDS = [
  "id",
  "title",
  "description",
  "is_active",
  ...buildDirectusContentBlockFields("content_blocks"),
].join(",");

export const PAGE_BLOCK_FIELDS = PAGE_FIELDS.split(",")
  .filter((field) => !["id", "title", "slug"].includes(field))
  .join(",");

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const preview = await getDirectusPreviewContext();
  const params = new URLSearchParams({
    fields: PAGE_FIELDS,
    limit: "1",
  });

  if (!preview.enabled) {
    params.set("filter[status][_eq]", "published");
  }

  params.set("filter[slug][_eq]", slug);

  const pages = await directusRequest<DirectusPage[]>(
    `/items/pages?${params.toString()}`,
    preview.requestOptions,
  );

  return hydratePageDynamicBlocks(normalizePage(pages[0] || null));
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
  const preview = await getDirectusPreviewContext();

  if (!preview.enabled) {
    params.set("filter[status][_eq]", "published");
  }

  const pages = await directusRequest<DirectusPage[]>(
    `/items/pages?${params.toString()}`,
    preview.requestOptions,
  );

  return hydratePageDynamicBlocks(normalizePage(pages[0] || null));
}

function normalizePage(page: DirectusPage | null): Page | null {
  if (!page?.slug) {
    return null;
  }

  return {
    id: page.id,
    title: page.title || "",
    slug: page.slug,
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

  if (block.collection === "block_articles") {
    return normalizeArticlesBlock(
      block.item as DirectusArticlesBlock | number | string | null,
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

  if (block.collection === "block_zero") {
    return normalizeZeroBlock(block.item as DirectusZeroBlock | number | string | null);
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
    limit: normalizePromptsBlockLimit(item.limit),
    selection: normalizePromptBlockSelection(item),
    selectionMode: normalizePromptsSelectionMode(item.selection_mode),
    prompts: normalizePromptCards(item.prompts || []),
  };
}

function normalizeArticlesBlock(
  item: DirectusArticlesBlock | number | string | null,
): PageArticlesBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false || !item.title) {
    return null;
  }

  return {
    id: item.id,
    type: "articles",
    title: item.title,
    description: item.description || "",
    link: item.link || null,
    limit: normalizeArticlesBlockLimit(item.limit),
    selection: {
      authorId: getDirectusUserId(item.author),
      tagIds: getArticleBlockTaxonomyIds(item.tags || [], "article_tags_id"),
      topicId: getDirectusReferenceId(item.topic),
    },
    selectionMode: normalizeArticlesSelectionMode(item.selection_mode),
    articles: normalizeArticleCards(item.articles || []),
  };
}

async function hydratePageDynamicBlocks(page: Page | null): Promise<Page | null> {
  if (!page) {
    return null;
  }

  return {
    ...page,
    blocks: await hydratePageBlocks(page.blocks),
  };
}

export async function hydratePageBlocks(blocks: PageBlock[]): Promise<PageBlock[]> {
  return Promise.all(
    blocks.map(async (block) => {
      if (block.type === "zero") {
        return hydrateZeroBlock(block);
      }

      if (block.type === "prompts" && block.selectionMode !== "manual") {
        return {
          ...block,
          prompts: await getDynamicPromptCards(block),
        };
      }

      if (block.type === "articles" && block.selectionMode !== "manual") {
        return {
          ...block,
          articles: await getDynamicArticleCards(block),
        };
      }

      return block;
    }),
  );
}

async function hydrateZeroBlock(block: PageZeroBlock): Promise<PageZeroBlock> {
  const item = await directusRequest<DirectusZeroBlock>(
    `/items/block_zero/${block.id}?fields=${ZERO_BLOCK_FIELDS}`,
    { next: { revalidate: 60 } },
  );

  const hydratedBlock = normalizeZeroBlock(item);

  return hydratedBlock || block;
}

async function getDynamicPromptCards(
  block: PagePromptsBlock,
): Promise<PagePromptCard[]> {
  const params = new URLSearchParams({
    fields: PROMPTS_BLOCK_ITEM_FIELDS,
    limit: String(block.limit),
    sort: block.selectionMode === "old" ? "published_at,id" : "-published_at,-id",
  });

  params.set("filter[status][_eq]", "published");

  const hasSelection = await applyDynamicPromptSelection(params, block);

  if (!hasSelection) {
    return [];
  }

  const prompts = await directusRequest<DirectusPrompt[]>(
    `/items/prompts?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizePromptItems(prompts);
}

async function getDynamicArticleCards(
  block: PageArticlesBlock,
): Promise<PageArticleCard[]> {
  const params = new URLSearchParams({
    fields: ARTICLES_BLOCK_ITEM_FIELDS,
    limit: String(block.limit),
    sort: block.selectionMode === "old" ? "created_at,id" : "-created_at,-id",
  });

  params.set("filter[status][_eq]", "published");

  if (!applyDynamicArticleSelection(params, block)) {
    return [];
  }

  const articles = await directusRequest<DirectusArticle[]>(
    `/items/articles?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  return normalizeArticleItems(articles);
}

function applyDynamicArticleSelection(
  params: URLSearchParams,
  block: PageArticlesBlock,
): boolean {
  const { selection, selectionMode } = block;

  if (selectionMode === "fresh" || selectionMode === "old") {
    return true;
  }

  if (selectionMode === "author" && selection.authorId) {
    params.set("filter[author][_eq]", selection.authorId);
    return true;
  }

  if (selectionMode === "topic" && selection.topicId) {
    params.set("filter[topics][article_topics_id][_eq]", String(selection.topicId));
    return true;
  }

  if (selectionMode === "tags" && selection.tagIds.length > 0) {
    params.set("filter[tags][article_tags_id][_in]", selection.tagIds.join(","));
    return true;
  }

  return false;
}

async function applyDynamicPromptSelection(
  params: URLSearchParams,
  block: PagePromptsBlock,
): Promise<boolean> {
  const { selection, selectionMode } = block;

  if (selectionMode === "fresh" || selectionMode === "old") {
    return true;
  }

  if (selectionMode === "author" && selection.authorId) {
    params.set("filter[author][_eq]", selection.authorId);
    return true;
  }

  if (selectionMode === "collection" && selection.collectionId) {
    const promptIds = await getPromptIdsByCollectionId(selection.collectionId);

    if (promptIds.length === 0) {
      return false;
    }

    params.set("filter[id][_in]", promptIds.join(","));
    return true;
  }

  if (selectionMode === "tags" && selection.tagIds.length > 0) {
    params.set("filter[tags][prompt_tags_id][_in]", selection.tagIds.join(","));
    return true;
  }

  if (selectionMode === "goal" && selection.goalId) {
    params.set("filter[goal][_eq]", String(selection.goalId));
    return true;
  }

  if (selectionMode === "type" && selection.typeIds.length > 0) {
    params.set("filter[types][prompt_types_id][_in]", selection.typeIds.join(","));
    return true;
  }

  if (selectionMode === "neural_network" && selection.neuralNetworkId) {
    params.set("filter[neural_network][_eq]", String(selection.neuralNetworkId));
    return true;
  }

  if (selectionMode === "difficulty" && selection.difficulty) {
    params.set("filter[difficulty][_eq]", selection.difficulty);
    return true;
  }

  return false;
}

async function getPromptIdsByCollectionId(collectionId: number): Promise<number[]> {
  const params = new URLSearchParams({
    fields: "prompts_id",
    limit: "-1",
  });

  params.set("filter[prompt_collections_id][_eq]", String(collectionId));

  const rows = await directusRequest<
    Array<{ prompts_id: number | { id: number } | null }>
  >(`/items/prompt_collections_prompts?${params.toString()}`, {
    next: { revalidate: 60 },
  });

  return rows
    .map((row) => getDirectusReferenceId(row.prompts_id))
    .filter((id): id is number => id !== null);
}

const PROMPTS_BLOCK_ITEM_FIELDS = [
  "id",
  "title",
  "slug",
  "description",
  "format",
  "difficulty",
  "autoplay",
  "views_count",
  "status",
  "published_at",
  "neural_network.name",
  "images.sort",
  "images.directus_files_id.id",
  "images.directus_files_id.title",
  "images.directus_files_id.type",
  "images.directus_files_id.width",
  "images.directus_files_id.height",
].join(",");

function normalizePromptsSelectionMode(
  mode: DirectusPromptsBlock["selection_mode"],
): PagePromptsBlock["selectionMode"] {
  if (
    mode === "fresh" ||
    mode === "old" ||
    mode === "author" ||
    mode === "collection" ||
    mode === "tags" ||
    mode === "goal" ||
    mode === "type" ||
    mode === "neural_network" ||
    mode === "difficulty"
  ) {
    return mode;
  }

  return "manual";
}

function normalizePromptsBlockLimit(limit: number | null): number {
  const normalized =
    typeof limit === "number" && Number.isFinite(limit) ? Math.trunc(limit) : 3;

  return Math.min(Math.max(normalized, 1), 24);
}

function normalizePromptBlockSelection(
  item: DirectusPromptsBlock,
): PagePromptsBlock["selection"] {
  const typeIds = [
    getDirectusReferenceId(item.prompt_type),
    ...getPromptBlockTaxonomyIds(item.types || [], "prompt_types_id"),
  ].filter((id): id is number => id !== null);

  return {
    authorId: getDirectusUserId(item.author),
    collectionId: getDirectusReferenceId(item.prompt_collection),
    difficulty: item.difficulty || null,
    goalId: getDirectusReferenceId(item.goal),
    neuralNetworkId: getDirectusReferenceId(item.neural_network),
    tagIds: getPromptBlockTaxonomyIds(item.tags || [], "prompt_tags_id"),
    typeIds: [...new Set(typeIds)],
  };
}

function getPromptBlockTaxonomyIds(
  items: DirectusPromptBlockTaxonomyJunction[],
  field: "prompt_tags_id" | "prompt_types_id",
): number[] {
  return [
    ...new Set(
      items
        .map((item) => getDirectusReferenceId(item[field] || null))
        .filter((id): id is number => id !== null),
    ),
  ];
}

function getDirectusReferenceId(
  reference: { id: number } | number | null,
): number | null {
  const id = typeof reference === "object" && reference !== null ? reference.id : reference;

  return typeof id === "number" && Number.isInteger(id) ? id : null;
}

function getDirectusUserId(
  author: DirectusPromptBlockAuthor | string | null,
): string | null {
  const id = typeof author === "object" && author !== null ? author.id : author;

  return typeof id === "string" && id ? id : null;
}

function normalizePromptCards(prompts: DirectusPromptJunction[]): PagePromptCard[] {
  return prompts
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((prompt) => prompt.prompts_id)
    .filter(isPublishedDirectusPrompt)
    .filter((prompt) => Boolean(prompt.title && prompt.slug))
    .map(normalizePromptCard);
}

function normalizePromptItems(prompts: DirectusPrompt[]): PagePromptCard[] {
  return prompts
    .filter(isPublishedDirectusPrompt)
    .filter((prompt) => Boolean(prompt.title && prompt.slug))
    .map(normalizePromptCard);
}

function normalizePromptCard(prompt: DirectusPrompt): PagePromptCard {
  return {
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
    autoplay: prompt.autoplay === true,
  };
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

function normalizeArticlesSelectionMode(
  mode: DirectusArticlesBlock["selection_mode"],
): PageArticlesBlock["selectionMode"] {
  if (
    mode === "fresh" ||
    mode === "old" ||
    mode === "topic" ||
    mode === "tags" ||
    mode === "author"
  ) {
    return mode;
  }

  return "manual";
}

function normalizeArticlesBlockLimit(limit: number | null): number {
  const normalized =
    typeof limit === "number" && Number.isFinite(limit) ? Math.trunc(limit) : 4;

  return Math.min(Math.max(normalized, 1), 24);
}

function getArticleBlockTaxonomyIds(
  items: DirectusArticleBlockTaxonomyJunction[],
  field: "article_tags_id" | "article_topics_id",
): number[] {
  return [
    ...new Set(
      items
        .map((item) => getDirectusReferenceId(item[field] || null))
        .filter((id): id is number => id !== null),
    ),
  ];
}

function normalizeArticleCards(
  articles: DirectusArticleJunction[],
): PageArticleCard[] {
  return articles
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((article) => article.articles_id)
    .filter(isPublishedDirectusArticle)
    .filter((article) => Boolean(article.title && article.slug))
    .map(normalizeArticleCard);
}

function normalizeArticleItems(articles: DirectusArticle[]): PageArticleCard[] {
  return articles
    .filter(isPublishedDirectusArticle)
    .filter((article) => Boolean(article.title && article.slug))
    .map(normalizeArticleCard);
}

function isPublishedDirectusArticle(
  article: DirectusArticle | number | null,
): article is DirectusArticle {
  return (
    typeof article === "object" &&
    article !== null &&
    (article.status === "published" || article.status === null)
  );
}

function normalizeArticleCard(article: DirectusArticle): PageArticleCard {
  return {
    id: article.id,
    title: article.title || "",
    description: article.description || "",
    href: `/articles/${article.slug || ""}`,
    image: normalizeImage(article.image, article.title || "Статья"),
    badge: getArticleCardBadge(article),
  };
}

function getArticleCardBadge(article: DirectusArticle): string {
  const topic = getArticleTaxonomyTitle(article.topics || [], "article_topics_id");

  if (topic) {
    return topic;
  }

  const tag = getArticleTaxonomyTitle(article.tags || [], "article_tags_id");

  if (tag) {
    return tag;
  }

  return article.article_type || "Статья";
}

function getArticleTaxonomyTitle(
  items: DirectusArticleBlockTaxonomyJunction[],
  field: "article_tags_id" | "article_topics_id",
): string | null {
  const taxonomy = [...items]
    .sort((first, second) => (first.sort || 0) - (second.sort || 0))
    .map((item) => item[field])
    .find(
      (item): item is { id: number; title?: string | null } =>
        typeof item === "object" && item !== null,
    );

  return taxonomy?.title || null;
}

const ARTICLES_BLOCK_ITEM_FIELDS = [
  "id",
  "title",
  "slug",
  "description",
  "article_type",
  "created_at",
  "status",
  "image.id",
  "image.title",
  "image.type",
  "image.width",
  "image.height",
  "topics.sort",
  "topics.article_topics_id.id",
  "topics.article_topics_id.title",
  "tags.sort",
  "tags.article_tags_id.id",
  "tags.article_tags_id.title",
].join(",");

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

function normalizeZeroBlock(
  item: DirectusZeroBlock | number | string | null,
): PageZeroBlock | null {
  if (!item || typeof item !== "object" || item.is_active === false) {
    return null;
  }

  return {
    id: item.id,
    type: "zero",
    title: item.title,
    description: item.description,
    contentBlocks: normalizeDirectusContentBlocks(item.content_blocks || []),
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
    url: buildDirectusAssetUrl(file.id, { type: file.type }),
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
