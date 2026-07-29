import type { Metadata } from 'next';
import { ErrorPage } from '@/widgets/error-page';
import { Footer } from '@/widgets/footer';
import { Header } from '@/widgets/header';

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

export default function NotFound() {
	return (
		<>
			<Header />
			<main>
				<ErrorPage variant='404' />
			</main>
			<Footer />
		</>
	);
}
