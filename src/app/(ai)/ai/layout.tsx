import type { Metadata } from 'next';
import type { FooterData } from '@/entities/footer';
import type { HeaderNavigation } from '@/entities/navigation';
import { getFooterData } from '@/shared/api/directus/footer';
import { getStudioHeaderNavigation } from '@/shared/api/directus/navigation';
import { AiShell } from '@/widgets/ai-shell';

export const revalidate = 60;

export const metadata: Metadata = {
	title: {
		default: 'Нейролюб Studio — генерация текста, изображений и видео',
		template: '%s — Нейролюб Studio',
	},
	description:
		'AI-студия Нейролюб: создавайте изображения, видео и тексты в одном интерфейсе.',
	robots: {
		index: false,
		follow: false,
	},
};

export default async function AiLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	let navigation: HeaderNavigation | null = null;
	let footer: FooterData | null = null;

	const [navigationResult, footerResult] = await Promise.allSettled([
		getStudioHeaderNavigation(),
		getFooterData(),
	]);
	if (navigationResult.status === 'fulfilled')
		navigation = navigationResult.value;
	if (footerResult.status === 'fulfilled') footer = footerResult.value;

	return (
		<AiShell
			footer={footer}
			logo={navigation?.logo || null}
			navigation={navigation?.items}
		>
			{children}
		</AiShell>
	);
}
