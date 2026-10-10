import Link from 'next/link';
import { type BreadcrumbItem, Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { buttonClassName } from '@/shared/ui/button';
import styles from './CatalogHeading.module.scss';

export type CatalogHeadingAction = {
	href: string;
	label: string;
	target?: '_self' | '_blank';
};

export function CatalogHeading({
	title,
	description,
	actions = [],
	breadcrumbs,
}: {
	title: string;
	description: string;
	actions?: CatalogHeadingAction[];
	breadcrumbs?: BreadcrumbItem[];
}) {
	return (
		<header className={styles.header}>
			{breadcrumbs && (
				<div className={styles.breadcrumbs}>
					<Breadcrumbs items={breadcrumbs} />
				</div>
			)}
			<div className={styles.heading}>
				<h1>{title}</h1>
				{actions.length > 0 && (
					<div className={styles.actions}>
						{actions.map((action, index) => (
							<Link
								className={buttonClassName('ghost')}
								key={`${action.href}-${index}`}
								href={action.href}
								target={action.target}
								rel={action.target === '_blank' ? 'noreferrer' : undefined}
							>
								{action.label}
							</Link>
						))}
					</div>
				)}
			</div>
			<div className={styles.copy}>{description && <p>{description}</p>}</div>
		</header>
	);
}
