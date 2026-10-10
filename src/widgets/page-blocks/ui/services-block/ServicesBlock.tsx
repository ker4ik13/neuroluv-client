import Link from 'next/link';
import type { NavigationIcon } from '@/entities/navigation';
import type { PageServiceCard, PageServicesBlock } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { BalancedGrid } from '@/shared/ui/balanced-grid';
import { buttonClassName } from '@/shared/ui/button';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './ServicesBlock.module.scss';

type ServicesBlockProps = {
	block: PageServicesBlock;
};

const FALLBACK_ICON: NavigationIcon = {
	title: 'Услуга',
	code: 'FaBriefcase',
	library: 'fa',
};

export function ServicesBlock({ block }: ServicesBlockProps) {
	if (block.services.length === 0) {
		return null;
	}

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading title={block.title} description={block.description} />
				<BalancedGrid>
					{block.services.map((service, index) => (
						<ServiceCard
							key={`service-${service.id}-${index}`}
							service={service}
						/>
					))}
				</BalancedGrid>
				{block.allServicesHref && (
					<div className={styles.actions}>
						<Link
							className={buttonClassName('ghost')}
							href={block.allServicesHref}
						>
							Все услуги
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}

function ServiceCard({ service }: { service: PageServiceCard }) {
	const className = `${styles.card} ${
		service.isPopular ? styles.cardPopular : ''
	}`;

	return (
		<article className={className}>
			<div className={styles.cardContent}>
				<div className={styles.cardTop}>
					<span className={styles.iconBox}>
						<AppIcon
							className={styles.icon}
							icon={service.icon || FALLBACK_ICON}
						/>
					</span>
					<h3 className={styles.cardTitle}>{service.title}</h3>
				</div>

				{service.description && (
					<p className={styles.cardDescription}>{service.description}</p>
				)}

				{service.advantages.length > 0 && (
					<>
						<ul className={styles.features}>
							{service.advantages.map((advantage, index) => (
								<li
									className={styles.feature}
									key={`advantage-${advantage}-${index}`}
								>
									<span className={styles.featureDot}>•</span>
									<span className={styles.featureText}>{advantage}</span>
								</li>
							))}
						</ul>
						<span className={styles.divider} />
					</>
				)}
			</div>

			<Link
				className={buttonClassName('ghost')}
				href={`/services/${service.href}`}
			>
				Подробнее
			</Link>
		</article>
	);
}
