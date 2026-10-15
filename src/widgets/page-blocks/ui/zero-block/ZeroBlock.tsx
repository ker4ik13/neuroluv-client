import type { PageZeroBlock } from '@/entities/page';
import {
	buildContentHeadings,
	ContentBlocks,
} from '@/shared/ui/content-blocks';
import styles from './ZeroBlock.module.scss';

type ZeroBlockProps = {
	block: PageZeroBlock;
};

export function ZeroBlock({ block }: ZeroBlockProps) {
	const headings = buildContentHeadings(block.contentBlocks);
	const hasHeader = Boolean(block.title || block.description);

	return (
		<section className={styles.section}>
			<div className={`${styles.inner} ${hasHeader ? styles.withHeader : ''}`}>
				{hasHeader && (
					<header className={styles.header}>
						{block.title && <h2>{block.title}</h2>}
						{block.description && <p>{block.description}</p>}
					</header>
				)}

				<div className={styles.content}>
					<ContentBlocks blocks={block.contentBlocks} contextTitle={block.title || undefined} headings={headings} />
				</div>
			</div>
		</section>
	);
}
