'use client';

import { usePathname } from 'next/navigation';
import type { FooterData } from '@/entities/footer';
import type { HeaderNavigation } from '@/entities/navigation';
import { AiShell } from '@/widgets/ai-shell';
import { ErrorPage } from '@/widgets/error-page';
import { FooterView } from '@/widgets/footer';
import { HeaderView } from '@/widgets/header/ui/HeaderView';
import './globals.scss';

const GLOBAL_ERROR_NAVIGATION: HeaderNavigation = {
	siteName: 'Нейролюб',
	logo: null,
	items: [],
	socialLinks: [],
};

const GLOBAL_ERROR_FOOTER: FooterData = {
	siteName: 'Нейролюб',
	description: 'AI-медиа и студия контента с нейросетями.',
	logo: null,
	socialLinks: [],
	columns: [],
	copyrightText: '© 2026 Нейролюб. Все права защищены',
	developerLabel: null,
	developerUrl: null,
	legalLinks: [],
};

export default function GlobalError() {
	const pathname = usePathname();
	const isAiEnvironment = pathname === '/ai' || pathname.startsWith('/ai/');
	const title = isAiEnvironment
		? 'Сервер немного шалит — Нейролюб Studio'
		: 'Сервер немного шалит | Нейролюб';
	const description = isAiEnvironment
		? 'Произошла ошибка в AI-студии. Попробуйте обновить страницу или вернуться на главную.'
		: 'Произошла ошибка на сервере. Попробуйте обновить страницу или вернуться на главную Нейролюба.';

	return (
		<html lang='ru'>
			<head>
				<title>{title}</title>
				<meta name='description' content={description} />
				<meta name='robots' content='noindex,follow' />
			</head>
			<body>
				{isAiEnvironment ? (
					<AiShell footer={GLOBAL_ERROR_FOOTER} logo={null}>
						<ErrorPage environment='ai' variant='500' />
					</AiShell>
				) : (
					<>
						<HeaderView navigation={GLOBAL_ERROR_NAVIGATION} />
						<main>
							<ErrorPage variant='500' />
						</main>
						<FooterView footer={GLOBAL_ERROR_FOOTER} />
					</>
				)}
			</body>
		</html>
	);
}
