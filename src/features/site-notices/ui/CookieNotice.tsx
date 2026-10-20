'use client';

import { FiShield } from 'react-icons/fi';
import type { CookieSettings } from '@/shared/lib/site-notices/types';
import { Button } from '@/shared/ui/button';
import styles from './SiteNotices.module.scss';

/** Informational notice: dismissing it never changes analytics. */
export function CookieNotice({
	settings,
	onAcknowledge,
	inDialog = false,
}: {
	settings: CookieSettings;
	onAcknowledge: () => void;
	inDialog?: boolean;
}) {
	return (
		<aside
			className={inDialog ? styles.cookieInfo : styles.cookies}
			role='region'
			aria-labelledby='site-cookie-title'
			data-cookie-banner={!inDialog || undefined}
		>
			<div className={styles.cookieHeading}>
				<span className={styles.cookieIcon}>
					<FiShield aria-hidden='true' />
				</span>
				<h2 id='site-cookie-title'>{settings.title}</h2>
			</div>
			<p>
				{settings.text}{' '}
				<a href={settings.policyUrl} target='_blank' rel='noopener noreferrer'>
					{settings.policyLabel}
				</a>
			</p>
			<div className={styles.actions}>
				<Button type='button' onClick={onAcknowledge}>
					{settings.acceptLabel}
				</Button>
			</div>
		</aside>
	);
}
