'use client';

import { FiZap } from 'react-icons/fi';
import { useState } from 'react';

import styles from './AiModelLogo.module.scss';

const DARK_MONOCHROME_LOGO_PATTERN =
	/^(?:(?:ChatGPT|OpenAI|Claude|Anthropic|Grok|xAI|Kling|Krea|Recraft|Nano\s*Banana)(?:\s|$)|GPT(?:[-\s]|$))/iu;
export function AiModelLogo({
	label,
	logoUrl,
	size = 'small',
}: {
	label: string;
	logoUrl?: string | null;
	size?: 'small' | 'medium';
}) {
	const [failedUrl, setFailedUrl] = useState<string | null>(null);
	const normalizedLabel = label.trim();
	const showImage = Boolean(logoUrl && failedUrl !== logoUrl);
	const usesAdaptiveMonochromeLogo =
		DARK_MONOCHROME_LOGO_PATTERN.test(normalizedLabel);

	return (
		<span
			aria-hidden='true'
			className={[
				styles.logo,
				size === 'medium' ? styles.logoMedium : '',
				usesAdaptiveMonochromeLogo ? styles.logoMonochrome : '',
			]
				.filter(Boolean)
				.join(' ')}
			title={label}
		>
			{showImage ? (
				// eslint-disable-next-line @next/next/no-img-element -- URL is a transformed Directus asset.
				<img
					alt=''
					src={logoUrl!}
					onError={() => setFailedUrl(logoUrl || null)}
				/>
			) : (
				<FiZap />
			)}
		</span>
	);
}
