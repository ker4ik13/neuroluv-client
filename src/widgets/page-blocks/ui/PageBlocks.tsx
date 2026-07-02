import type { PageBlock } from "@/entities/page";
import { AboutBlock } from "@/widgets/page-blocks/ui/about-block/AboutBlock";
import { HeroBlock } from "@/widgets/page-blocks/ui/hero-block/HeroBlock";
import { ServicesBlock } from "@/widgets/page-blocks/ui/services-block/ServicesBlock";
import { TaskExamplesBlock } from "@/widgets/page-blocks/ui/task-examples-block/TaskExamplesBlock";

type PageBlocksProps = {
  blocks: PageBlock[];
};

const blockRenderers = {
  hero: (block: Extract<PageBlock, { type: "hero" }>) => <HeroBlock block={block} />,
  about: (block: Extract<PageBlock, { type: "about" }>) => (
    <AboutBlock block={block} />
  ),
  taskExamples: (block: Extract<PageBlock, { type: "taskExamples" }>) => (
    <TaskExamplesBlock block={block} />
  ),
  services: (block: Extract<PageBlock, { type: "services" }>) => (
    <ServicesBlock block={block} />
  ),
};

export function PageBlocks({ blocks }: PageBlocksProps) {
  return (
    <>
      {blocks.map((block) => {
        return (
          <PageBlockItem block={block} key={`${block.type}-${block.id}`} />
        );
      })}
    </>
  );
}

function PageBlockItem({ block }: { block: PageBlock }) {
  if (block.type === "hero") {
    return blockRenderers.hero(block);
  }

  if (block.type === "about") {
    return blockRenderers.about(block);
  }

  if (block.type === "taskExamples") {
    return blockRenderers.taskExamples(block);
  }

  if (block.type === "services") {
    return blockRenderers.services(block);
  }

  return null;
}
