'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import type { AiPlan } from '@/shared/api/ai';
import { buttonClassName } from '@/shared/ui/button';
import { getPlansForPeriod, getRecommendedPlan } from '../model/studio-pricing';
import { PlanCard } from './PlanCard';
import styles from './StudioPricingSection.module.scss';

export function StudioPricingSection({ plans }: { plans: AiPlan[] }) {
	const { locale, t } = useAiLocale();
	const [period, setPeriod] = useState<'month' | 'year'>('month');
	const hasMonthly = plans.some((plan) => plan.interval === 'month');
	const hasYearly = plans.some((plan) => plan.interval === 'year');
	const activePeriod = getPlansForPeriod(plans, period).length
		? period
		: hasMonthly
			? 'month'
			: 'year';
	const available = getPlansForPeriod(plans, activePeriod);
	const featured = getRecommendedPlan(available);
	return (
		<section
			className={styles.section}
			id='studio-pricing'
			aria-labelledby='studio-pricing-title'
		>
			<div className={styles.heading}>
				<div>
					<h2 id='studio-pricing-title'>
						{t('Тарифы для ваших задач', 'Plans for your projects')}
					</h2>
					<p>
						{t(
							'Выберите объём кредитов. Все модели доступны в одной студии — тариф определяет ваш бюджет на генерации.',
							'Choose your credit budget. Use models in one studio and pick a plan for your generation needs.',
						)}
					</p>
				</div>
				{hasMonthly && hasYearly && (
					<div
						className={styles.periods}
						role='group'
						aria-label={t('Период подписки', 'Billing period')}
					>
						{(['month', 'year'] as const).map((value) => (
							<button
								type='button'
								aria-pressed={activePeriod === value}
								key={value}
								onClick={() => setPeriod(value)}
							>
								{value === 'month' ? t('Месяц', 'Monthly') : t('Год', 'Yearly')}
							</button>
						))}
					</div>
				)}
			</div>
			{available.length ? (
				<div className={styles.track} aria-label={t('Тарифы', 'Plans')}>
					{available.map((plan) => (
						<PlanCard
							key={plan.id}
							plan={plan}
							locale={locale}
							featured={plan.id === featured?.id}
							badgeLabel={
								plan.id === featured?.id
									? plan.badge || t('Рекомендуем', 'Recommended')
									: plan.badge
							}
							action={
								<Link
									className={buttonClassName(
										plan.id === featured?.id ? 'primary' : 'ghost',
									)}
									href={`/ai/balance?plan=${encodeURIComponent(plan.id)}`}
								>
									{t('Выбрать тариф', 'Choose plan')}
								</Link>
							}
						/>
					))}
				</div>
			) : (
				<div className={styles.unavailable}>
					<FiCreditCard aria-hidden='true' />
					<p>
						{t(
							'Не удалось загрузить тарифы. Попробуйте открыть страницу баланса.',
							'Unable to load plans. Please check the balance page.',
						)}
					</p>
				</div>
			)}
			<div className={styles.footer}>
				<p>
					{t(
						'Стоимость зависит от модели и настроек. Перед запуском вы увидите оценку в кредитах.',
						'Costs depend on the model and settings. You will see a credit estimate before starting.',
					)}
				</p>
				<Link className={styles.allPlans} href='/ai/balance'>
					{t('Тарифы и пополнение', 'Plans and credit packs')}
				</Link>
			</div>
		</section>
	);
}
