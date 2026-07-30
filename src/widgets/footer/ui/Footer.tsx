import type { FooterData } from '@/entities/footer';
import { getFooterData } from '@/shared/api/directus/footer';
import { FooterView } from './FooterView';

const FALLBACK_FOOTER: FooterData = {
	siteName: 'Нейролюб',
	description:
		'AI-медиа, галерея промптов и студия контента для тех, кто создаёт фото, видео, UGC и визуал с помощью нейросетей.',
	logo: null,
	socialLinks: [],
	columns: [
		{
			id: 'sections',
			title: 'Разделы',
			links: [
				{ id: 'news', label: 'Новости', href: '/news', target: '_self' },
				{ id: 'gallery', label: 'Галерея', href: '/gallery', target: '_self' },
				{ id: 'articles', label: 'Статьи', href: '/articles', target: '_self' },
				{ id: 'services', label: 'Услуги', href: '/services', target: '_self' },
			],
		},
	],
	copyrightText: '© 2026 Нейролюб. Все права защищены',
	developerLabel: '@ker4ik13',
	developerUrl: 'https://t.me/ker4ik13',
	contactLink: {
		id: 'contacts',
		label: 'Контакты',
		href: '/contacts',
		target: '_self',
	},
	legalLinks: [
		{
			id: 'user-agreement',
			label: 'Пользовательское соглашение',
			href: '/legal/user-agreement',
			target: '_self',
		},
		{
			id: 'public-offer',
			label: 'Публичная оферта',
			href: '/legal/public-offer',
			target: '_self',
		},
		{
			id: 'personal-data-policy',
			label: 'Политика обработки персональных данных',
			href: '/legal/personal-data-policy',
			target: '_self',
		},
		{
			id: 'personal-data-consent',
			label: 'Согласие на обработку персональных данных',
			href: '/legal/personal-data-consent',
			target: '_self',
		},
		{
			id: 'marketing-consent',
			label: 'Согласие на рассылки',
			href: '/legal/marketing-consent',
			target: '_self',
		},
	],
};

export async function Footer() {
	let footer = FALLBACK_FOOTER;

	try {
		footer = await getFooterData();
	} catch {
		footer = FALLBACK_FOOTER;
	}

	return <FooterView footer={footer} />;
}
