'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { FiCopy } from 'react-icons/fi';
import { FiCheck } from 'react-icons/fi';
import { Button } from '@/shared/ui/button';
import styles from './CopyContentBox.module.scss';

type CopyContentBoxProps = {
	children: ReactNode;
	className?: string;
	copiedLabel?: string;
	copyLabel?: string;
	copyText: string;
	title: string;
	plainText?: boolean;
};

export function CopyContentBox({
	children,
	className,
	copiedLabel = 'Скопировано',
	copyLabel = 'Скопировать',
	copyText,
	title,
	plainText = false,
}: CopyContentBoxProps) {
	const [isCopied, setIsCopied] = useState(false);
	const [error, setError] = useState(false);

	async function handleCopy() {
		const text = plainText
			? copyText
			: copyText
					.replace(/<[^>]*>/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();

		try {
			setError(false);
			await navigator.clipboard.writeText(text);
			setIsCopied(true);
			window.setTimeout(() => setIsCopied(false), 1600);
		} catch {
			setIsCopied(false);
			setError(true);
		}
	}

	return (
		<div
			className={`${styles.box} ${plainText ? styles.plainText : ''} ${className || ''}`}
		>
			<div className={styles.head}>
				<h3>{title}</h3>
				<Button
					className={styles.button}
					variant='ghost'
					onClick={handleCopy}
					type='button'
				>
					<span className={styles.labels}>
						<span aria-hidden={isCopied} data-active={!isCopied}>
							{copyLabel}
						</span>
						<span aria-hidden={!isCopied} data-active={isCopied}>
							{copiedLabel}
						</span>
					</span>
					{isCopied ? (
						<FiCheck aria-hidden='true' />
					) : (
						<FiCopy aria-hidden='true' />
					)}
				</Button>
			</div>
			<div className={styles.content}>{children}</div>
			<span className={styles.status} role='status'>
				{isCopied ? copiedLabel : ''}
			</span>
			{error ? (
				<p className={styles.error} role='alert'>
					{copyLabel === 'Copy'
						? 'Copy failed. Select the text and copy it manually.'
						: 'Не удалось скопировать. Выделите текст и скопируйте вручную.'}
				</p>
			) : null}
		</div>
	);
}
