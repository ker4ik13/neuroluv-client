import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './FeatureCard.module.scss';

export function FeatureCard({
	title,
	description,
	marker,
	variant = 'cards',
	href,
	isSelected = false,
	framed = true,
	actions,
	tone = 'neutral',
}: {
	title: string;
	description?: string | null;
	marker?: ReactNode;
	variant?: 'cards' | 'compact';
	href?: string | null;
	isSelected?: boolean;
	framed?: boolean;
	actions?: ReactNode;
	tone?: 'neutral' | 'warning';
}) {
	const content = (
		<>
			{marker && (
				<span className={styles.marker} aria-hidden={tone !== 'warning'}>
					{marker}
				</span>
			)}
			<div className={styles.body}>
				<h3>{title}</h3>
				{description && <p>{description}</p>}
				{actions}
			</div>
		</>
	);
	const props = {
		className: styles.card,
		'data-variant': variant,
		'data-selected': isSelected,
		'data-has-marker': Boolean(marker),
		'data-framed': framed,
		'data-tone': tone,
	};
	return href ? (
		<Link {...props} href={href}>
			{content}
		</Link>
	) : (
		<article {...props}>{content}</article>
	);
}
