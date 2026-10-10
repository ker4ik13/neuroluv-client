import { FiGrid } from 'react-icons/fi';
import type { PageTaskGridBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { FeatureCard } from '@/shared/ui/feature-card';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './TaskGridBlock.module.scss';

type TaskGridBlockProps = {
	block: PageTaskGridBlock;
};

export function TaskGridBlock({ block }: TaskGridBlockProps) {
	if (block.tasks.length === 0) {
		return null;
	}

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading
					title={block.title}
					description={block.description}
					align='split'
				/>
				<BalancedGrid>
					{block.tasks.map((task, index) => (
						<FeatureCard
							key={`task-grid-${task.id}-${index}`}
							title={task.title}
							description={task.description}
							marker={task.icon ? <AppIcon icon={task.icon} /> : <FiGrid />}
							variant={block.layout}
						/>
					))}
				</BalancedGrid>
			</div>
		</section>
	);
}
