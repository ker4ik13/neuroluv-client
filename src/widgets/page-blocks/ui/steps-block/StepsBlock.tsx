import type { PageStepsBlock } from '@/entities/page';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { FeatureCard } from '@/shared/ui/feature-card';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './StepsBlock.module.scss';

type StepsBlockProps = {
	block: PageStepsBlock;
};

export function StepsBlock({ block }: StepsBlockProps) {
	if (block.steps.length === 0) {
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
					{block.steps.map((step, index) => (
						<FeatureCard
							key={`step-${step.id}-${index}`}
							title={step.title}
							description={step.description}
							marker={String(index + 1).padStart(2, '0')}
							variant={block.layout}
						/>
					))}
				</BalancedGrid>
			</div>
		</section>
	);
}
