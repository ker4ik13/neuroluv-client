'use client';

import { type ComponentPropsWithoutRef, useId, useRef, useState } from 'react';
import { useAiLocale } from '@/features/ai-locale';
import {
	AiApiError,
	downloadAiMedia,
	resolveAiMediaUrl,
} from '@/shared/api/ai';
import styles from './MediaDownloadLink.module.scss';

type Props = Omit<
	ComponentPropsWithoutRef<'a'>,
	'href' | 'download' | 'onClick'
> & {
	href: string;
	fileName?: string;
};

export function MediaDownloadLink({
	href,
	fileName,
	children,
	title,
	className = '',
	...props
}: Props) {
	const { t } = useAiLocale();
	const id = useId();
	const pending = useRef(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	return (
		<>
			<a
				{...props}
				className={`${className} ${isDownloading ? styles.downloading : ''}`}
				href={resolveAiMediaUrl(href)}
				download={fileName || true}
				aria-busy={isDownloading}
				aria-disabled={isDownloading || undefined}
				aria-describedby={error ? id : undefined}
				title={
					isDownloading
						? t('Скачиваем файл…', 'Downloading file…')
						: error || title
				}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					if (pending.current) return;
					pending.current = true;
					setIsDownloading(true);
					setError(null);
					void downloadAiMedia(href, fileName)
						.catch((reason: unknown) => {
							setError(
								reason instanceof AiApiError && reason.problem.status < 500
									? reason.problem.title
									: t(
											'Не удалось скачать файл. Попробуйте ещё раз.',
											'Unable to download the file. Please try again.',
										),
							);
						})
						.finally(() => {
							pending.current = false;
							setIsDownloading(false);
						});
				}}
			>
				{children}
			</a>
			{error ? (
				<span id={id} className={styles.error} role='alert'>
					{error}
				</span>
			) : null}
		</>
	);
}
