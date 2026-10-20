import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { NoticesPreview } from './NoticesPreview';

export const metadata: Metadata = {
	title: 'Модалки, CTA и cookies — локальный предпросмотр',
	robots: { index: false, follow: false },
};

export default function NoticesPreviewLayout({
	children,
}: {
	children: ReactNode;
}) {
	if (process.env.NODE_ENV !== 'development') notFound();
	return <NoticesPreview>{children}</NoticesPreview>;
}
