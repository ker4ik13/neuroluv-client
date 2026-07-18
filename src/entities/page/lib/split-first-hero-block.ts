import type { PageBlock, PageHeroBlock } from "../model/types";

type SplitFirstHeroBlockResult = {
  hero: PageHeroBlock | null;
  remainingBlocks: PageBlock[];
};

export function splitFirstHeroBlock(
  blocks: PageBlock[],
): SplitFirstHeroBlockResult {
  const heroIndex = blocks.findIndex((block) => block.type === "hero");

  if (heroIndex === -1) {
    return {
      hero: null,
      remainingBlocks: blocks,
    };
  }

  return {
    hero: blocks[heroIndex] as PageHeroBlock,
    remainingBlocks: blocks.filter((_, index) => index !== heroIndex),
  };
}
