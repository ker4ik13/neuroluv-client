import type { Metadata } from 'next';
import { SiteNoticesProvider } from '@/features/site-notices';
import { getSiteNotices } from '@/shared/api/directus/site-notices';
import { MATOMO_BOOTSTRAP, YANDEX_METRIKA_ID } from '@/shared/config/analytics';
import { AnalyticsQueryPersistence } from '@/shared/ui/analytics-query-persistence';
import { Matomo, MatomoHead } from '@/shared/ui/matomo';
import { YandexMetrika, YandexMetrikaHead } from '@/shared/ui/yandex-metrika';
import './globals.scss';

export const metadata: Metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL || 'https://neuroluv.ru',
	),
	alternates: {
		types: {
			'application/rss+xml': '/yandex-news.xml',
		},
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const siteNotices = await getSiteNotices();
	return (
		<html lang='ru' data-scroll-behavior='smooth'>
			<head>
				<YandexMetrikaHead counterId={YANDEX_METRIKA_ID} />
				<MatomoHead bootstrap={MATOMO_BOOTSTRAP} />
			</head>
			<body>
				<YandexMetrika counterId={YANDEX_METRIKA_ID} />
				<Matomo />
				<AnalyticsQueryPersistence />
				<SiteNoticesProvider initialConfig={siteNotices}>
					{children}
				</SiteNoticesProvider>
			</body>
		</html>
	);
}
