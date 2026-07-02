import type { PageBlock } from "@/entities/page";
import { AboutBlock } from "@/widgets/page-blocks/ui/about-block/AboutBlock";
import { BigCtaBlock } from "@/widgets/page-blocks/ui/big-cta-block/BigCtaBlock";
import { FaqBlock } from "@/widgets/page-blocks/ui/faq-block/FaqBlock";
import { HeroBlock } from "@/widgets/page-blocks/ui/hero-block/HeroBlock";
import { MiniCtaBlock } from "@/widgets/page-blocks/ui/mini-cta-block/MiniCtaBlock";
import { PromptsBlock } from "@/widgets/page-blocks/ui/prompts-block/PromptsBlock";
import { ServicesBlock } from "@/widgets/page-blocks/ui/services-block/ServicesBlock";
import { StepsBlock } from "@/widgets/page-blocks/ui/steps-block/StepsBlock";
import { TableBlock } from "@/widgets/page-blocks/ui/table-block/TableBlock";
import { TaskGridBlock } from "@/widgets/page-blocks/ui/task-grid-block/TaskGridBlock";
import { TaskExamplesBlock } from "@/widgets/page-blocks/ui/task-examples-block/TaskExamplesBlock";
import { UseCasesBlock } from "@/widgets/page-blocks/ui/use-cases-block/UseCasesBlock";

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
  faq: (block: Extract<PageBlock, { type: "faq" }>) => <FaqBlock block={block} />,
  useCases: (block: Extract<PageBlock, { type: "useCases" }>) => (
    <UseCasesBlock block={block} />
  ),
  steps: (block: Extract<PageBlock, { type: "steps" }>) => (
    <StepsBlock block={block} />
  ),
  table: (block: Extract<PageBlock, { type: "table" }>) => (
    <TableBlock block={block} />
  ),
  prompts: (block: Extract<PageBlock, { type: "prompts" }>) => (
    <PromptsBlock block={block} />
  ),
  taskGrid: (block: Extract<PageBlock, { type: "taskGrid" }>) => (
    <TaskGridBlock block={block} />
  ),
  bigCta: (block: Extract<PageBlock, { type: "bigCta" }>) => (
    <BigCtaBlock block={block} />
  ),
  miniCta: (block: Extract<PageBlock, { type: "miniCta" }>) => (
    <MiniCtaBlock block={block} />
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

  if (block.type === "faq") {
    return blockRenderers.faq(block);
  }

  if (block.type === "useCases") {
    return blockRenderers.useCases(block);
  }

  if (block.type === "steps") {
    return blockRenderers.steps(block);
  }

  if (block.type === "table") {
    return blockRenderers.table(block);
  }

  if (block.type === "prompts") {
    return blockRenderers.prompts(block);
  }

  if (block.type === "taskGrid") {
    return blockRenderers.taskGrid(block);
  }

  if (block.type === "bigCta") {
    return blockRenderers.bigCta(block);
  }

  if (block.type === "miniCta") {
    return blockRenderers.miniCta(block);
  }

  return null;
}
