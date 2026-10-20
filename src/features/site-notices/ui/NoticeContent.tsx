'use client';

import { FiCheck, FiX } from 'react-icons/fi';
import { modalFromHash } from '@/shared/lib/site-notices/policy';
import type { NoticeButton, SiteNotice } from '@/shared/lib/site-notices/types';
import { buttonClassName } from '@/shared/ui/button';
import styles from './SiteNotices.module.scss';

export function NoticeContent({
	notice,
	floating = false,
	onAction,
	onClose,
}: {
	notice: SiteNotice;
	floating?: boolean;
	onAction: (button: NoticeButton) => void;
	onClose: () => void;
}) {
	return (
		<>
			{floating && (
				<button
					type='button'
					aria-label='Закрыть предложение'
					className={styles.cardClose}
					onClick={onClose}
				>
					<FiX aria-hidden='true' />
				</button>
			)}
			{notice.image && (
				<div className={styles.image}>
					{/* Public CMS assets are transformed by the Directus URL helper. */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={notice.image.url}
						alt={notice.image.alt}
						width={notice.image.width || undefined}
						height={notice.image.height || undefined}
					/>
				</div>
			)}
			<div className={styles.content} data-has-image={Boolean(notice.image)}>
				{notice.badge && <span className={styles.badge}>{notice.badge}</span>}
				<h2 id={floating ? 'site-floating-title' : 'site-modal-title'}>
					{notice.title}
				</h2>
				{notice.text && <p className={styles.text}>{notice.text}</p>}
				{notice.benefits.length > 0 && (
					<ul className={styles.benefits}>
						{notice.benefits.map((benefit, index) => (
							<li key={index}>
								<FiCheck aria-hidden='true' />
								<span>{benefit}</span>
							</li>
						))}
					</ul>
				)}
				{notice.footnote && (
					<p className={styles.footnote}>{notice.footnote}</p>
				)}
				{notice.buttons.length > 0 && (
					<div className={styles.actions} data-count={notice.buttons.length}>
						{notice.buttons.map((button) =>
							button.action === 'link' ? (
								<a
									data-notice-action
									className={buttonClassName(button.variant)}
									href={button.href}
									key={button.id}
									target={button.newTab ? '_blank' : undefined}
									rel={button.newTab ? 'noopener noreferrer' : undefined}
									onClick={(event) => {
										if (
											modalFromHash(button.href) ||
											button.href === '#cookie-settings'
										)
											event.preventDefault();
										onAction(button);
									}}
								>
									{button.label}
								</a>
							) : (
								<button
									className={buttonClassName(button.variant)}
									type='button'
									key={button.id}
									onClick={() => onAction(button)}
								>
									{button.label}
								</button>
							),
						)}
					</div>
				)}
			</div>
		</>
	);
}
