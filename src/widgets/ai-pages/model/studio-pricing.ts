import type { AiPlan } from '@/shared/api/ai';

export function getRecommendedPlan(plans: readonly AiPlan[]): AiPlan | null {
	const sorted = plans
		.filter((plan) => plan.amountMinor > 0)
		.toSorted((a, b) => a.amountMinor - b.amountMinor);
	return sorted[Math.floor((sorted.length - 1) / 2)] ?? null;
}

export function getPlansForPeriod(
	plans: readonly AiPlan[],
	period: 'month' | 'year',
): AiPlan[] {
	return plans
		.filter((plan) => plan.interval === period)
		.toSorted((a, b) => a.amountMinor - b.amountMinor);
}
