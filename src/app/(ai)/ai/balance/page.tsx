import type { Metadata } from 'next';
import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import { BalancePage } from '@/widgets/ai-pages';

export function generateMetadata(): Promise<Metadata> {
	return buildAiPageMetadata('/ai/balance', {
		title: 'Баланс',
		description: 'Баланс, подписка и пополнение кредитов.',
	});
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ plan?: string | string[] }>;
}) {
	const params = await searchParams;
	return (
		<BalancePage
			initialPlanId={typeof params.plan === 'string' ? params.plan : undefined}
		/>
	);
}
