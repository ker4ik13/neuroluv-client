import Image from 'next/image';
import Link from 'next/link';
import type { PageArticleCard, PageArticlesBlock } from '@/entities/page';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { buttonClassName } from '@/shared/ui/button';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './ArticlesBlock.module.scss';

type ArticlesBlockProps = {
	block: PageArticlesBlock;
};

export function ArticlesBlock({ block }: ArticlesBlockProps) {
	if (block.articles.length === 0) {
		return null;
	}

	const [featuredArticle, ...otherArticles] = block.articles;
	const compactArticles = otherArticles.slice(0, 3);
	const additionalArticles = otherArticles.slice(3);

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading title={block.title} description={block.description} />
				{block.layout === 'cards' ? (
					<BalancedGrid maxColumns={3}>
						{block.articles.map((article) => (
							<ArticleCard
								key={article.id}
								article={article}
								variant='featured'
							/>
						))}
					</BalancedGrid>
				) : (
					<>
						<div
							className={styles.primaryCards}
							data-single={compactArticles.length === 0}
						>
							<ArticleCard article={featuredArticle} variant='featured' />

							{compactArticles.length > 0 && (
								<div className={styles.compactCards}>
									{compactArticles.map((article, index) => (
										<ArticleCard
											article={article}
											key={`article-${article.id}-${index}`}
											variant='compact'
										/>
									))}
								</div>
							)}
						</div>

						{additionalArticles.length > 0 && (
							<div className={styles.additionalCards}>
								{additionalArticles.map((article, index) => (
									<ArticleCard
										article={article}
										key={`article-${article.id}-${index + compactArticles.length}`}
										variant='compact'
									/>
								))}
							</div>
						)}
					</>
				)}
				{block.link && (
					<div className={styles.actions}>
						<Link className={buttonClassName('ghost')} href={block.link}>
							Больше полезного
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}

type ArticleCardProps = {
	article: PageArticleCard;
	variant: 'compact' | 'featured';
};

function ArticleCard({ article, variant }: ArticleCardProps) {
	const isFeatured = variant === 'featured';

	return (
		<Link
			className={isFeatured ? styles.featuredCard : styles.compactCard}
			href={article.href}
		>
			<ArticleMedia article={article} variant={variant} />

			<span
				className={isFeatured ? styles.featuredContent : styles.compactContent}
			>
				<span className={styles.badge}>{article.badge}</span>
				<span
					className={isFeatured ? styles.featuredTitle : styles.compactTitle}
				>
					{article.title}
				</span>
				{article.description && (
					<span
						className={
							isFeatured
								? styles.featuredDescription
								: styles.compactDescription
						}
					>
						{article.description}
					</span>
				)}
			</span>
		</Link>
	);
}

function ArticleMedia({
	article,
	variant,
}: {
	article: PageArticleCard;
	variant: ArticleCardProps['variant'];
}) {
	const imageClassName =
		variant === 'featured' ? styles.featuredImage : styles.compactImage;

	return (
		<span className={imageClassName}>
			{article.image ? (
				<Image
					alt={article.image.title || article.title}
					fill
					priority={variant === 'featured'}
					sizes={
						variant === 'featured'
							? '(max-width: 1024px) 100vw, 600px'
							: '(max-width: 1024px) 42vw, 160px'
					}
					src={article.image.url}
				/>
			) : (
				<span className={styles.mediaPlaceholder} aria-hidden='true'>
					AI
				</span>
			)}
		</span>
	);
}
