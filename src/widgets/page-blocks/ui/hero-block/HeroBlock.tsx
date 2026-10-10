import type { CSSProperties } from 'react';
import { FaTelegram } from 'react-icons/fa';
import type { PageHeroBlock, PageImage } from '@/entities/page';
import { PromptCardMedia } from '@/shared/ui/prompt-card-media';
import { BlockActions } from '../block-actions/BlockActions';
import styles from './HeroBlock.module.scss';

type HeroBlockProps = {
	block: PageHeroBlock;
	examples?: HeroGalleryItem[];
};

export type HeroGalleryItem = {
	id: string;
	href: string;
	url: string;
	alt: string;
	type?: string | null;
	images?: PageImage[];
	autoplay?: boolean;
};

export function HeroBlock({ block, examples = [] }: HeroBlockProps) {
	const gallery = block.galleryId
		? (block.galleryPrompts || []).flatMap((prompt): HeroGalleryItem[] =>
				prompt.image
					? [
							{
								id: String(prompt.id),
								href: prompt.href,
								url: prompt.image.url,
								alt: prompt.title,
								type: prompt.image.type,
								images: prompt.images,
								autoplay: prompt.autoplay,
							},
						]
					: [],
			)
		: examples;
	const items = gallery.slice(0, 4);
	const image = block.galleryId ? null : block.image;
	return (
		<section className={styles.hero}>
			<div
				className={`${styles.inner} ${!image && !items.length ? styles.innerWithoutMedia : ''}`}
				data-layout={block.layout || 'split'}
			>
				<div className={styles.content}>
					<h1 className={styles.title}>{block.title}</h1>
					<BlockActions buttons={block.buttons} />
					{block.description && (
						<p className={styles.description}>{block.description}</p>
					)}
					{block.link && (
						<a
							className={styles.telegram}
							href={normalizeExternalLink(block.link)}
							rel='noreferrer'
							target='_blank'
						>
							<FaTelegram aria-hidden='true' className={styles.telegramIcon} />
							<span>{block.link}</span>
						</a>
					)}
				</div>

				{items.length ? (
					<div
						className={styles.gallery}
						style={{ '--hero-examples-count': items.length } as CSSProperties}
					>
						{items.map((example, index) => (
							<PromptCardMedia
								className={styles.galleryItem}
								alt={example.alt}
								href={example.href}
								key={example.id}
								image={{ id: example.id, url: example.url, type: example.type }}
								images={example.images}
								autoPlay={example.autoplay}
								priority={index === 0}
								sizes='(max-width: 768px) 45vw, 310px'
							/>
						))}
					</div>
				) : image ? (
					<div className={styles.imageWrap}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img alt={image.title} className={styles.image} src={image.url} />
					</div>
				) : null}
			</div>
		</section>
	);
}

function normalizeExternalLink(link: string): string {
	if (/^https?:\/\//.test(link)) {
		return link;
	}

	return `https://${link}`;
}
