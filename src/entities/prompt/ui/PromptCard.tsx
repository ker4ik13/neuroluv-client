import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { FiZap } from 'react-icons/fi';
import { getImageAlt } from '@/shared/lib/media/image-alt';
import { PromptCardMedia } from '@/shared/ui/prompt-card-media';
import type { PromptItem, PromptTaxonomy } from '../model';
import { getPromptPreviewRatio } from '../model/gallery';
import styles from './PromptCard.module.scss';

export type PromptCardData = Omit<
	Pick<
		PromptItem,
		| 'id'
		| 'title'
		| 'href'
		| 'image'
		| 'images'
		| 'autoplay'
		| 'format'
		| 'difficultyLabel'
	>,
	'id'
> & {
	id: number | string;
	neuralNetwork: Pick<PromptTaxonomy, 'title' | 'logo'> | null;
	contentKind?: Pick<PromptTaxonomy, 'title'> | null;
	types?: Array<Pick<PromptTaxonomy, 'title'>>;
};

export function PromptCard({
	prompt,
	headingLevel = 2,
	squarePreview = false,
	actions,
	priority = false,
}: {
	prompt: PromptCardData;
	headingLevel?: 2 | 3;
	squarePreview?: boolean;
	actions?: ReactNode;
	priority?: boolean;
}) {
	const Heading = headingLevel === 3 ? 'h3' : 'h2';
	const type = prompt.contentKind || prompt.types?.[0];
	const image = prompt.image || prompt.images[0];
	const previewRatio = squarePreview
		? 1
		: getPromptPreviewRatio(image, prompt.format);

	return (
		<article
			className={styles.card}
			style={{ '--prompt-preview-ratio': previewRatio } as CSSProperties}
		>
			<PromptCardMedia
				alt={
					prompt.image
						? getImageAlt(prompt.image.title, prompt.title)
						: prompt.title
				}
				autoPlay={prompt.autoplay}
				className={styles.cardImage}
				href={prompt.href}
				image={prompt.image}
				images={prompt.images}
				priority={priority}
				sizes='(max-width: 768px) 50vw, (max-width: 1280px) 45vw, 290px'
			>
				<span className={styles.cardPlaceholder}>
					{type?.title || prompt.neuralNetwork?.title || 'AI'}
				</span>
			</PromptCardMedia>

			<Link className={styles.cardBody} href={prompt.href}>
				<span className={styles.badges}>
					{type && <span className={styles.badgePrimary}>{type.title}</span>}
					{prompt.neuralNetwork && (
						<span className={styles.badge}>
							<PromptNetworkLogo network={prompt.neuralNetwork} />
							{prompt.neuralNetwork.title}
						</span>
					)}
				</span>
				<Heading className={styles.cardTitle}>{prompt.title}</Heading>
				{(prompt.format || prompt.difficultyLabel) && (
					<span className={styles.detailLine}>
						{[prompt.format, prompt.difficultyLabel]
							.filter(Boolean)
							.join(' · ')}
					</span>
				)}
			</Link>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</article>
	);
}

function PromptNetworkLogo({
	network,
}: {
	network: Pick<PromptTaxonomy, 'title' | 'logo'>;
}) {
	return (
		<span aria-hidden='true' className={styles.networkLogo}>
			{network.logo ? (
				<Image alt='' height={14} src={network.logo.url} width={14} />
			) : (
				<FiZap />
			)}
		</span>
	);
}
