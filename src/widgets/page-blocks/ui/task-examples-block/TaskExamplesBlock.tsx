import { FiFileText } from 'react-icons/fi';
import type { PageTaskExamplesBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { FeatureCard } from '@/shared/ui/feature-card';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './TaskExamplesBlock.module.scss';

export function TaskExamplesBlock({ block }: { block: PageTaskExamplesBlock }) {
	if (!block.cards.length) return null;
	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading
					title={block.title}
					description={block.description}
					align='split'
				/>
				<BalancedGrid>
					{block.cards.map((card) => (
						<FeatureCard
							key={card.id}
							title={card.title}
							description={card.description}
							href={card.href}
							isSelected={card.isSelected}
							marker={card.icon ? <AppIcon icon={card.icon} /> : <FiFileText />}
						/>
					))}
				</BalancedGrid>
			</div>
		</section>
	);
}
