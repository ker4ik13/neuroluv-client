import Image from "next/image";
import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

import type { PageArticleCard, PageArticlesBlock } from "@/entities/page";

import styles from "./ArticlesBlock.module.scss";

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
        <div className={styles.head}>
          <div className={styles.headText}>
            <h2 className={styles.title}>{block.title}</h2>
            {block.description && (
              <p className={styles.description}>{block.description}</p>
            )}
          </div>

          {block.link && (
            <Link className={styles.moreLink} href={block.link}>
              Больше полезного
              <FaArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className={styles.primaryCards}>
          <ArticleCard article={featuredArticle} variant="featured" />

          {compactArticles.length > 0 && (
            <div className={styles.compactCards}>
              {compactArticles.map((article, index) => (
                <ArticleCard
                  article={article}
                  key={`article-${article.id}-${index}`}
                  variant="compact"
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
                variant="compact"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type ArticleCardProps = {
  article: PageArticleCard;
  variant: "compact" | "featured";
};

function ArticleCard({ article, variant }: ArticleCardProps) {
  const isFeatured = variant === "featured";

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
        <span className={isFeatured ? styles.featuredTitle : styles.compactTitle}>
          {article.title}
        </span>
        {article.description && (
          <span
            className={
              isFeatured ? styles.featuredDescription : styles.compactDescription
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
  variant: ArticleCardProps["variant"];
}) {
  const imageClassName =
    variant === "featured" ? styles.featuredImage : styles.compactImage;

  return (
    <span className={imageClassName}>
      {article.image ? (
        <Image
          alt={article.image.title || article.title}
          fill
          priority={variant === "featured"}
          sizes={
            variant === "featured"
              ? "(max-width: 1024px) 100vw, 600px"
              : "(max-width: 1024px) 42vw, 160px"
          }
          src={article.image.url}
        />
      ) : (
        <span className={styles.mediaPlaceholder} aria-hidden="true">
          AI
        </span>
      )}
    </span>
  );
}
