import type { CSSProperties } from 'react';
import { Masonry } from '@/shared/ui/masonry';
import { PromptCard, type PromptCardData } from './PromptCard';
import styles from './PromptGallery.module.scss';

export function PromptGallery({
	prompts,
	layout = 'masonry',
	headingLevel = 2,
}: {
	prompts: PromptCardData[];
	layout?: 'masonry' | 'grid';
	headingLevel?: 2 | 3;
}) {
	const cards = prompts.map((prompt) => (
		<PromptCard
			key={prompt.id}
			prompt={prompt}
			headingLevel={headingLevel}
			squarePreview={layout === 'grid'}
		/>
	));
	return (
		<div className={styles.gallery} data-prompt-gallery data-layout={layout}>
			{layout === 'grid' ? (
				<div
					className={styles.grid}
					style={
						{
							'--gallery-columns': Math.min(3, prompts.length || 1),
						} as CSSProperties
					}
				>
					{cards}
				</div>
			) : (
				<Masonry>{cards}</Masonry>
			)}
		</div>
	);
}
