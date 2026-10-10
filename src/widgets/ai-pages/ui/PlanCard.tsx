import type { HTMLAttributes, ReactNode } from 'react';
import { FiCheck } from 'react-icons/fi';
import type { AiPlan } from '@/shared/api/ai';
import { formatCredits } from '@/shared/lib/formatCredits';
import { formatMoney } from '../model/format';
import styles from './PlanCard.module.scss';

export function PlanCard({
	plan,
	locale,
	featured = false,
	active = false,
	badgeLabel,
	action,
	className = '',
	...props
}: {
	plan: AiPlan;
	locale: 'ru-RU' | 'en-US';
	featured?: boolean;
	active?: boolean;
	badgeLabel?: string | null;
	action: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>) {
	const yearly = plan.interval === 'year';
	const english = locale === 'en-US';
	return (
		<article
			{...props}
			className={`${styles.card} ${featured ? styles.featured : ''} ${active ? styles.active : ''} ${className}`}
		>
			<header className={styles.heading}>
				<h3>{plan.name}</h3>
				{badgeLabel && <span className={styles.badge}>{badgeLabel}</span>}
			</header>
			{plan.description && (
				<p className={styles.description}>{plan.description}</p>
			)}
			<div className={styles.price}>
				<strong>
					{formatMoney(
						yearly ? Math.round(plan.amountMinor / 12) : plan.amountMinor,
						plan.currency,
						locale,
					)}
				</strong>
				<span>{english ? '/ month' : '/ месяц'}</span>
			</div>
			{yearly && (
				<p className={styles.yearly}>
					{english ? 'Billed yearly:' : 'За год:'}{' '}
					{formatMoney(plan.amountMinor, plan.currency, locale)}
				</p>
			)}
			<p className={styles.credits}>
				{formatCredits(plan.credits, locale)}
				<small>
					{yearly
						? english
							? 'for the full year'
							: 'на весь год'
						: english
							? 'per month'
							: 'в месяц'}
				</small>
			</p>
			<ul>
				{plan.features.map((feature, index) => (
					<li key={`${index}-${feature}`}>
						<FiCheck aria-hidden='true' />
						{feature}
					</li>
				))}
			</ul>
			<div className={styles.action}>{action}</div>
		</article>
	);
}
