import type { Metadata } from 'next';

import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import { TelegramRegistrationPage } from '@/widgets/ai-pages';

export function generateMetadata(): Promise<Metadata> {
	return buildAiPageMetadata('/ai/auth/telegram-complete', {
		title: 'Завершение регистрации',
		description: 'Завершение регистрации через Telegram в Нейролюб Studio.',
	});
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = await searchParams;
	const value = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
	return <TelegramRegistrationPage initialReturnTo={sanitizeAiReturnTo(value)} />;
}

function sanitizeAiReturnTo(value: string | undefined): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
		return '/ai';
	}
	try {
		const parsed = new URL(value, 'https://return-to.invalid');
		if (parsed.pathname !== '/ai' && !parsed.pathname.startsWith('/ai/')) return '/ai';
		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return '/ai';
	}
}
