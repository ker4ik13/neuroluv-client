import type { PageBigCtaBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { FeatureCard } from '@/shared/ui/feature-card';
import { CtaPanel } from '../cta-panel/CtaPanel';

export function BigCtaBlock({ block }: { block: PageBigCtaBlock }) {
	return (
		<CtaPanel
			{...block}
			tone={block.tone || 'dark'}
			footer={
				block.steps.length > 0 ? (
					<BalancedGrid>
						{block.steps.map((step, index) => (
							<FeatureCard
								key={step.id}
								title={step.title}
								description={step.description}
								marker={String(index + 1).padStart(2, '0')}
								variant='compact'
								framed={false}
							/>
						))}
					</BalancedGrid>
				) : undefined
			}
		>
			{block.advantages.length > 0 && (
				<BalancedGrid
					maxColumns={
						block.image && !['centered', 'banner'].includes(block.layout || '')
							? 2
							: 4
					}
				>
					{block.advantages.map((item) => (
						<FeatureCard
							key={item.id}
							title={item.title}
							description={item.description}
							marker={item.icon ? <AppIcon icon={item.icon} /> : undefined}
							variant='compact'
							framed={false}
						/>
					))}
				</BalancedGrid>
			)}
		</CtaPanel>
	);
}
