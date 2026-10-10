import Link from 'next/link';
import type { PagePromptsBlock } from '@/entities/page';
import { type PromptCardData, PromptGallery } from '@/entities/prompt';
import { buttonClassName } from '@/shared/ui/button';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './PromptsBlock.module.scss';

type PromptsBlockProps = {
	block: PagePromptsBlock;
};

const difficultyLabels: Record<string, string> = {
	easy: 'Легко',
	medium: 'Средне',
	hard: 'Сложно',
};

export function PromptsBlock({ block }: PromptsBlockProps) {
	if (block.prompts.length === 0) {
		return null;
	}
	const prompts: PromptCardData[] = block.prompts.map((prompt) => ({
		...prompt,
		difficultyLabel: prompt.difficulty
			? difficultyLabels[prompt.difficulty] || prompt.difficulty
			: null,
		neuralNetwork: prompt.neuralNetwork
			? { title: prompt.neuralNetwork }
			: null,
	}));

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading title={block.title} description={block.description} />
				<PromptGallery
					prompts={prompts}
					layout={block.layout}
					headingLevel={3}
				/>
				{block.link && (
					<div className={styles.actions}>
						<Link className={buttonClassName('ghost')} href={block.link}>
							Все промпты
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
