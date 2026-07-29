import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

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

export default function UnmatchedAiRoute(): never {
	notFound();
}
