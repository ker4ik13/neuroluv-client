import type { Metadata } from 'next';
import { ErrorPage } from '@/widgets/error-page';

export const metadata: Metadata = {
	title: {
		absolute: 'Страница убежала с сайта | Нейролюб',
	},
	description:
		'Страница не найдена. Вернитесь на главную Нейролюба или перейдите к новостям, статьям и промптам.',
	robots: {
		index: false,
		follow: true,
	},
};

export default function UserNotFound() {
	return <ErrorPage variant='404' />;
}
