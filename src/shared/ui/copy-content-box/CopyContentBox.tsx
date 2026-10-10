'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { FiCopy } from 'react-icons/fi';
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
				<button className={styles.button} onClick={handleCopy} type='button'>
					{isCopied ? copiedLabel : copyLabel}
					<FiCopy aria-hidden='true' />
				</button>
			</div>
			<div className={styles.content}>{children}</div>
			{error ? (
				<p role='alert'>
					{copyLabel === 'Copy'
						? 'Copy failed. Select the text and copy it manually.'
						: 'Не удалось скопировать. Выделите текст и скопируйте вручную.'}
				</p>
			) : null}
		</div>
	);
}
