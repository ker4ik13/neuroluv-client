import Image from 'next/image';
import type { ReactNode } from 'react';
import type {
	PageCtaLayout,
	PageCtaTone,
	PageHeroButton,
	PageImage,
} from '@/entities/page';
import { BlockActions } from '../block-actions/BlockActions';
import styles from './CtaPanel.module.scss';

export function CtaPanel({
	title,
	description,
	image,
	buttons,
	layout = 'image_right',
	tone = 'neutral',
	children,
	footer,
	density = 'comfortable',
}: {
	title: string;
	description?: string;
	image: PageImage | null;
	buttons: PageHeroButton[];
	layout?: PageCtaLayout;
	tone?: PageCtaTone;
	children?: ReactNode;
	footer?: ReactNode;
	density?: 'comfortable' | 'compact';
}) {
	const showImage = Boolean(image && layout !== 'banner');
	return (
		<section className={styles.section}>
			<div
				className={styles.panel}
				data-layout={layout}
				data-tone={tone}
				data-has-image={showImage}
				data-density={density}
			>
				<div className={styles.content}>
					<h2>{title}</h2>
					{description && <p className={styles.description}>{description}</p>}
					{children}
					{layout !== 'banner' && (
						<BlockActions buttons={buttons} className={styles.actions} />
					)}
				</div>
				{showImage && image && (
					<div
						className={styles.media}
						style={
							image.width && image.height
								? { aspectRatio: image.width / image.height }
								: undefined
						}
					>
						<Image
							alt={image.title}
							className={styles.image}
							fill
							sizes='(max-width: 768px) 85vw, 480px'
							src={image.url}
						/>
					</div>
				)}
				{layout === 'banner' && (
					<BlockActions buttons={buttons} className={styles.actions} />
				)}
				{footer && <div className={styles.footer}>{footer}</div>}
			</div>
		</section>
	);
}
