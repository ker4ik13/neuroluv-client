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
  variant: "primary" | "secondary";
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

export type PageBlock = PageHeroBlock | PageAboutBlock;

export type Page = {
  id: number;
  title: string;
  slug: string;
  blocks: PageBlock[];
};
