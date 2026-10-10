import type { PageFaqBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { FaqAccordion } from '@/shared/ui/faq-accordion';
import styles from './FaqBlock.module.scss';

type FaqBlockProps = {
	block: PageFaqBlock;
};

export function FaqBlock({ block }: FaqBlockProps) {
	if (block.questions.length === 0) {
		return null;
	}

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<div className={styles.head}>
					<h2 className={styles.title}>{block.title}</h2>
					{(block.description || block.link) && (
						<p className={styles.description}>
							{block.description && <span>{block.description}</span>}
							{block.link && (
								<a
									className={styles.link}
									href={normalizeExternalLink(block.link)}
									rel='noreferrer'
									target='_blank'
								>
									<AppIcon className={styles.linkIcon} icon={block.icon} />
									<span>{block.link}</span>
								</a>
							)}
						</p>
					)}
				</div>

				<FaqAccordion items={block.questions} />
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
