import { FiCheckCircle, FiZap } from 'react-icons/fi';
import type { PageUseCaseCard, PageUseCasesBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { BlockActions } from '../block-actions/BlockActions';
import styles from './UseCasesBlock.module.scss';

type UseCasesBlockProps = {
	block: PageUseCasesBlock;
};

export function UseCasesBlock({ block }: UseCasesBlockProps) {
	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<div className={styles.intro} data-has-image={Boolean(block.cardImage)}>
					<div className={styles.introText}>
						<h2 className={styles.title}>{block.cardTitle}</h2>
						{block.cardDescription && (
							<p className={styles.description}>{block.cardDescription}</p>
						)}
						<BlockActions buttons={block.buttons} />
					</div>

					{block.cardImage && (
						<div className={styles.imageWrap}>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								alt={block.cardImage.title}
								className={styles.image}
								src={block.cardImage.url}
							/>
						</div>
					)}
				</div>

				{block.useCases.length > 0 && (
					<BalancedGrid>
						{block.useCases.map((card, index) => (
							<UseCaseCard card={card} key={`use-case-${card.id}-${index}`} />
						))}
					</BalancedGrid>
				)}

				{(block.adviceTitle || block.adviceDescription) && (
					<div className={styles.advice}>
						<span className={styles.adviceIconBox}>
							{block.adviceIcon ? (
								<AppIcon
									className={styles.adviceIcon}
									icon={block.adviceIcon}
								/>
							) : (
								<FiZap aria-hidden='true' className={styles.adviceIcon} />
							)}
						</span>
						{block.adviceTitle && (
							<strong className={styles.adviceTitle}>
								{block.adviceTitle}
							</strong>
						)}
						{block.adviceDescription && (
							<p className={styles.adviceDescription}>
								{block.adviceDescription}
							</p>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

function UseCaseCard({ card }: { card: PageUseCaseCard }) {
	return (
		<article className={styles.card}>
			<h3 className={styles.cardTitle}>{card.title}</h3>
			{card.tasks.length > 0 && (
				<ul className={styles.tasks}>
					{card.tasks.map((task, index) => (
						<li className={styles.task} key={`task-${task}-${index}`}>
							<FiCheckCircle aria-hidden='true' className={styles.taskIcon} />
							<span>{task}</span>
						</li>
					))}
				</ul>
			)}
		</article>
	);
}
