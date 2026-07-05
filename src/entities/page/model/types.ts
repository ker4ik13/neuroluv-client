import type { NavigationIcon } from "@/entities/navigation";

export type PageImage = {
  id: string;
  title: string;
  url: string;
  type: string | null;
  width: number | null;
  height: number | null;
};

export type PageHeroButton = {
  id: number;
  label: string;
  href: string;
  target: "_self" | "_blank";
  variant: "primary" | "secondary" | "outline";
  icon: NavigationIcon | null;
};

export type PageHeroBlock = {
  id: number;
  type: "hero";
  theme: "dark" | "light";
  eyebrow: string | null;
  title: string;
  description: string;
  link: string | null;
  image: PageImage | null;
  buttons: PageHeroButton[];
};

export type PageAboutCard = {
  id: number;
  title: string;
  description: string;
  icon: NavigationIcon | null;
};

export type PageAboutBlock = {
  id: number;
  type: "about";
  title: string;
  description: string;
  advantageTitle: string | null;
  advantageDescription: string | null;
  advantageImage: PageImage | null;
  cards: PageAboutCard[];
};

export type PageTaskExamplesCard = {
  id: number;
  title: string;
  description: string;
  href: string | null;
  isSelected: boolean;
  icon: NavigationIcon | null;
};

export type PageTaskExamplesBlock = {
  id: number;
  type: "taskExamples";
  title: string;
  description: string;
  cards: PageTaskExamplesCard[];
};

export type PageServiceCard = {
  id: number;
  title: string;
  description: string;
  href: string;
  isPopular: boolean;
  icon: NavigationIcon | null;
  advantages: string[];
};

export type PageServicesBlock = {
  id: number;
  type: "services";
  title: string;
  description: string;
  allServicesHref: string | null;
  services: PageServiceCard[];
};

export type PageFaqItem = {
  id: number;
  title: string;
  answer: string;
};

export type PageFaqBlock = {
  id: number;
  type: "faq";
  title: string;
  description: string;
  link: string | null;
  icon: NavigationIcon | null;
  questions: PageFaqItem[];
};

export type PageUseCaseCard = {
  id: number;
  title: string;
  tasks: string[];
};

export type PageUseCasesBlock = {
  id: number;
  type: "useCases";
  title: string;
  description: string;
  cardTitle: string;
  cardDescription: string;
  cardImage: PageImage | null;
  adviceIcon: NavigationIcon | null;
  adviceTitle: string | null;
  adviceDescription: string | null;
  buttons: PageHeroButton[];
  useCases: PageUseCaseCard[];
};

export type PageStepItem = {
  id: number;
  title: string;
  description: string;
};

export type PageStepsBlock = {
  id: number;
  type: "steps";
  title: string;
  description: string;
  steps: PageStepItem[];
};

export type PageTableColumn = {
  id: number;
  title: string;
  isSelected: boolean;
};

export type PageTableRow = {
  id: number;
  cells: string[];
};

export type PageTableBlock = {
  id: number;
  type: "table";
  title: string;
  description: string;
  columns: PageTableColumn[];
  rows: PageTableRow[];
};

export type PagePromptCard = {
  id: number;
  title: string;
  description: string;
  href: string;
  format: string | null;
  difficulty: string | null;
  viewsCount: number;
  neuralNetwork: string | null;
  image: PageImage | null;
};

export type PagePromptsBlock = {
  id: number;
  type: "prompts";
  title: string;
  description: string;
  link: string | null;
  selectionMode: "manual" | "popular" | "fresh";
  prompts: PagePromptCard[];
};

export type PageTaskGridItem = {
  id: number;
  title: string;
  description: string;
  icon: NavigationIcon | null;
};

export type PageTaskGridBlock = {
  id: number;
  type: "taskGrid";
  title: string;
  description: string;
  tasks: PageTaskGridItem[];
};

export type PageCtaItem = {
  id: number;
  title: string;
  description: string;
  icon: NavigationIcon | null;
};

export type PageBigCtaBlock = {
  id: number;
  type: "bigCta";
  title: string;
  description: string;
  image: PageImage | null;
  buttons: PageHeroButton[];
  advantages: PageCtaItem[];
  steps: Omit<PageCtaItem, "icon">[];
};

export type PageMiniCtaBlock = {
  id: number;
  type: "miniCta";
  title: string;
  description: string;
  image: PageImage | null;
  buttons: PageHeroButton[];
};

export type PageBlock =
  | PageHeroBlock
  | PageAboutBlock
  | PageTaskExamplesBlock
  | PageServicesBlock
  | PageFaqBlock
  | PageUseCasesBlock
  | PageStepsBlock
  | PageTableBlock
  | PagePromptsBlock
  | PageTaskGridBlock
  | PageBigCtaBlock
  | PageMiniCtaBlock;

export type Page = {
  id: number;
  title: string;
  slug: string;
  h1: string | null;
  h1Description: string | null;
  blocks: PageBlock[];
};
