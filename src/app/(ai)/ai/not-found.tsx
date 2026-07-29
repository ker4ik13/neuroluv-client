import type { Metadata } from 'next';
import { ErrorPage } from '@/widgets/error-page';

export const metadata: Metadata = {
	title: {
		absolute: 'Страница не найдена — Нейролюб Studio',
	},
	description:
		'Такой страницы в AI-студии Нейролюба нет. Вернитесь на главную или откройте каталог AI-промптов.',
	robots: {
		index: false,
		follow: false,
	},
};

export default function AiNotFound() {
	return <ErrorPage environment='ai' variant='404' />;
}
