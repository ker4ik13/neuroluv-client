import type { PageSeo } from "@/entities/seo";

export type NewsImage = {
  id: string;
  title: string;
  url: string;
  type: string | null;
  width: number | null;
  height: number | null;
};

export type NewsTaxonomy = {
  id: number;
  title: string;
  slug: string;
  description: string;
};

export type NewsAuthor = {
  id: string;
  name: string;
  avatar: NewsImage | null;
};

export type NewsItem = {
  id: number;
  title: string;
  slug: string;
  href: string;
  description: string;
  miniDescription: string;
  image: NewsImage | null;
  publishedAt: string | null;
  publishedAtLabel: string;
  updatedAt: string | null;
  readTime: number | null;
  viewsCount: number | null;
  author: NewsAuthor | null;
  topic: NewsTaxonomy | null;
  tags: NewsTaxonomy[];
  seo: PageSeo | null;
};

export type NewsSortOrder = "fresh" | "old";

export type NewsContentButton = {
  id: number;
  label: string;
  href: string;
  target: "_self" | "_blank";
  variant: "primary" | "secondary" | "outline";
};

export type NewsContentListItem = {
  id: number;
  title: string;
  description: string;
};

export type NewsContentCard = {
  id: number;
  title: string;
  description: string;
  href: string | null;
  image: NewsImage | null;
};

export type NewsContentStep = {
  id: number;
  title: string;
  description: string;
};

export type NewsContentBlock =
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
      items: NewsContentListItem[];
    }
  | {
      id: number;
      type: "image";
      title: string | null;
      caption: string | null;
      image: NewsImage;
    }
  | {
      id: number;
      type: "video";
      title: string | null;
      caption: string | null;
      video: NewsImage | null;
      videoUrl: string | null;
    }
  | {
      id: number;
      type: "cta";
      title: string;
      description: string;
      buttons: NewsContentButton[];
    }
  | {
      id: number;
      type: "cards";
      title: string | null;
      cards: NewsContentCard[];
    }
  | {
      id: number;
      type: "steps";
      title: string | null;
      steps: NewsContentStep[];
    };

export type NewsDetail = NewsItem & {
  contentBlocks: NewsContentBlock[];
  miniCta: Extract<NewsContentBlock, { type: "cta" }> | null;
};

export type NewsPageData = {
  hasMore: boolean;
  news: NewsItem[];
  sidebarNews: NewsItem[];
  topics: NewsTaxonomy[];
  tags: NewsTaxonomy[];
};

export type NewsDetailPageData = {
  item: NewsDetail;
  related: NewsItem[];
};
