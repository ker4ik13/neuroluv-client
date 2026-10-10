import type { CSSProperties } from 'react';
import { getSocialBrand } from '@/shared/lib/social/brands';
import { BrandIcon } from '@/shared/ui/brand-icon';
import styles from './SocialLink.module.scss';

export function SocialLink({
	href,
	platform,
	label,
	className = '',
	iconClassName,
}: {
	href: string;
	platform: string;
	label: string;
	className?: string;
	iconClassName?: string;
}) {
	const brand = getSocialBrand(platform);
	return (
		<a
			aria-label={label}
			className={`${styles.link} ${className}`}
			href={href}
			rel='noreferrer'
			target='_blank'
			title={label}
			data-social-platform={brand?.platform || platform}
			style={
				{
					'--social-color': brand?.color || 'var(--ui-accent)',
					'--social-dark-color':
						brand?.darkColor || brand?.color || 'var(--ui-accent)',
				} as CSSProperties
			}
		>
			<BrandIcon className={iconClassName} platform={platform} />
		</a>
	);
}
