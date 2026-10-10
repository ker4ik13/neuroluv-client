import type { PageAboutBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { FeatureCard } from '@/shared/ui/feature-card';
import styles from './AboutBlock.module.scss';

type AboutBlockProps = {
	block: PageAboutBlock;
};

export function AboutBlock({ block }: AboutBlockProps) {
	return (
		<section className={styles.about}>
			<div className={styles.inner} data-layout={block.layout || 'split'}>
				<div className={styles.textColumn}>
					<div className={styles.content}>
						<h2 className={styles.title}>{block.title}</h2>
						<p className={styles.description}>{block.description}</p>
					</div>
					{(block.advantageImage ||
						block.advantageTitle ||
						block.advantageDescription) && (
						<div className={styles.promptCard}>
							{block.advantageImage && (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									alt={block.advantageImage.title}
									className={styles.promptImage}
									src={block.advantageImage.url}
								/>
							)}

							<div className={styles.promptOverlay}>
								{block.advantageTitle && (
									<strong className={styles.promptNumber}>
										{block.advantageTitle}
									</strong>
								)}
								{block.advantageDescription && (
									<span className={styles.promptText}>
										{block.advantageDescription}
									</span>
								)}
							</div>
						</div>
					)}
				</div>

				{block.cards.length > 0 && (
					<BalancedGrid maxColumns={block.layout === 'cards' ? 4 : 2}>
						{block.cards.map((card, index) => (
							<FeatureCard
								key={`about-card-${card.id}-${index}`}
								title={card.title}
								description={card.description}
								marker={card.icon ? <AppIcon icon={card.icon} /> : undefined}
							/>
						))}
					</BalancedGrid>
				)}
			</div>
		</section>
	);
}
