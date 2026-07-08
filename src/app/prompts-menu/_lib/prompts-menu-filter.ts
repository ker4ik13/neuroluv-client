export type PromptsMenuFilterType =
  | "collection"
  | "goal"
  | "kind"
  | "network"
  | "tag";

export type PromptsMenuFilter = {
  path: string;
  type: PromptsMenuFilterType;
  value: string;
};

const FILTER_PREFIXES: PromptsMenuFilterType[] = [
  "collection",
  "network",
  "goal",
  "kind",
  "tag",
];

export function parsePromptsMenuFilter(slug: string): PromptsMenuFilter | null {
  for (const type of FILTER_PREFIXES) {
    const prefix = `${type}-`;

    if (!slug.startsWith(prefix)) {
      continue;
    }

    const value = slug.slice(prefix.length);

    if (!value) {
      return null;
    }

    return {
      path: `/prompts-menu/${slug}`,
      type,
      value,
    };
  }

  return null;
}
