import type { PageBlock } from "@/entities/page";
import { HeroBlock } from "@/widgets/page-blocks/ui/hero-block/HeroBlock";

type PageBlocksProps = {
  blocks: PageBlock[];
};

export function PageBlocks({ blocks }: PageBlocksProps) {
  return (
    <>
      {blocks.map((block) => {
        if (block.type === "hero") {
          return <HeroBlock block={block} key={`${block.type}-${block.id}`} />;
        }

        return null;
      })}
    </>
  );
}
