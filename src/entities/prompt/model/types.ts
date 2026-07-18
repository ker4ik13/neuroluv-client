import type { PageSeo } from "@/entities/seo";

export type PromptImage = {
  id: string;
  title: string;
  url: string;
  type: string | null;
  width: number | null;
  height: number | null;
};

export type PromptTaxonomy = {
  id: number;
  title: string;
  slug: string;
  description: string;
  count?: number;
  isFilterable?: boolean;
  seoNoindex?: boolean;
};

export type PromptAuthor = {
  id: string;
  name: string;
  jobTitle: string | null;
  avatar: PromptImage | null;
};

export type PromptContentBlock =
  | {
      id: number;
      type: "html";
      title: string | null;
      content: string;
    }
  | {
      id: number;
      type: "text";
      title: string | null;
      content: string;
    }
  | {
      id: number;
      type: "quote";
      title: string | null;
      text: string;
      author: string | null;
    }
  | {
      id: number;
      type: "list";
      title: string | null;
      items: PromptContentListItem[];
    }
  | {
      id: number;
      type: "image";
      title: string | null;
      caption: string | null;
      image: PromptImage;
    }
  | {
      id: number;
      type: "video";
      title: string | null;
      caption: string | null;
      video: PromptImage | null;
      videoUrl: string | null;
    }
  | {
      id: number;
      type: "cta";
      title: string;
      description: string;
      buttons: PromptContentButton[];
    }
  | {
      id: number;
      type: "cards";
      title: string | null;
      cards: PromptContentCard[];
    }
  | {
      id: number;
      type: "steps";
      title: string | null;
      steps: PromptContentStep[];
    };

export type PromptContentListItem = {
  id: number;
  title: string;
  description: string;
};

export type PromptContentButton = {
  id: number;
  label: string;
  href: string;
  target: "_self" | "_blank";
  variant: "primary" | "secondary" | "outline";
};

export type PromptContentCard = {
  id: number;
  title: string;
  description: string;
  href: string | null;
  image: PromptImage | null;
};

export type PromptContentStep = {
  id: number;
  title: string;
  description: string;
};

export type PromptItem = {
  id: number;
  title: string;
  slug: string;
  href: string;
  description: string;
  image: PromptImage | null;
  images: PromptImage[];
  autoplay: boolean;
  isPaid: boolean;
  neuralNetwork: PromptTaxonomy | null;
  contentKind: PromptTaxonomy | null;
  format: string | null;
  formatRef: PromptTaxonomy | null;
  difficulty: string | null;
  difficultyLabel: string | null;
  goal: PromptTaxonomy | null;
  types: PromptTaxonomy[];
  tags: PromptTaxonomy[];
  author: PromptAuthor | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewsCount: number;
  seo: PageSeo | null;
};

export type PromptDetail = PromptItem & {
  promptText: string;
  contentBlocks: PromptContentBlock[];
};

export type PromptSortOrder = "fresh" | "old" | "popular";

export type PromptsPageData = {
  hasMore: boolean;
  prompts: PromptItem[];
  sidebarPrompts: PromptItem[];
  totalCount: number;
  types: PromptTaxonomy[];
  contentKinds: PromptTaxonomy[];
  formats: PromptTaxonomy[];
  tags: PromptTaxonomy[];
  goals: PromptTaxonomy[];
  neuralNetworks: PromptTaxonomy[];
};

export type PromptCollectionItem = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  href: string;
  cover: PromptImage | null;
  count: number;
  publishedAt: string | null;
  seoNoindex?: boolean;
};

export type PromptCollectionsPageData = {
  hasMore: boolean;
  items: PromptCollectionItem[];
};

export type PromptTagGroup = {
  kind: PromptTaxonomy;
  tags: PromptTaxonomy[];
};

export type PromptsMenuPageData = {
  collections: PromptCollectionItem[];
  collectionsHasMore: boolean;
  contentKinds: PromptTaxonomy[];
  goals: PromptTaxonomy[];
  neuralNetworks: PromptTaxonomy[];
  tagGroups: PromptTagGroup[];
};

export type PromptDetailPageData = {
  item: PromptDetail;
  related: PromptItem[];
};
