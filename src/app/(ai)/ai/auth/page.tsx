import type { Metadata } from 'next';
import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import { AuthPage } from '@/widgets/ai-pages';

export function generateMetadata(): Promise<Metadata> {
	return buildAiPageMetadata('/ai/auth', {
		title: 'Вход',
		description: 'Вход или регистрация в Нейролюб Studio.',
	});
}

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = await searchParams;
	const returnTo = sanitizeAiReturnTo(firstValue(query.returnTo));
	const authError = firstValue(query.authError)?.slice(0, 128);

	return (
		<AuthPage
			initialAuthError={authError}
			initialReturnTo={returnTo}
			initialMode={firstValue(query.mode) === 'register' ? 'register' : 'login'}
		/>
	);
}

function firstValue(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

function sanitizeAiReturnTo(value: string | undefined): string {
	if (
		!value ||
		!value.startsWith('/') ||
		value.startsWith('//') ||
		value.includes('\\')
	) {
		return '/ai';
	}

	try {
		const parsed = new URL(value, 'https://return-to.invalid');
		if (parsed.pathname !== '/ai' && !parsed.pathname.startsWith('/ai/')) {
			return '/ai';
		}

		return `${parsed.pathname}${parsed.search}${parsed.hash}`;
	} catch {
		return '/ai';
	}
}
