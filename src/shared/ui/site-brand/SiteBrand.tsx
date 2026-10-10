'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentProps, useId } from 'react';
import { FiBookOpen, FiCpu, FiLayers } from 'react-icons/fi';
import { buttonClassName } from '@/shared/ui/button';
import { Select } from '@/shared/ui/select';
import { SiteHeaderLogo } from '@/shared/ui/site-header-logo';
import styles from './SiteBrand.module.scss';

type Area = 'library' | 'studio';

export function SiteBrand({
	area,
	name = 'Нейролюб',
	logo = null,
	english = false,
	onNavigate,
}: {
	area: Area;
	name?: string;
	logo?: ComponentProps<typeof SiteHeaderLogo>['logo'];
	english?: boolean;
	onNavigate?: () => void;
}) {
	const id = useId();
	const router = useRouter();
	const areas = [
		{
			value: 'library' as const,
			label: english ? 'Library' : 'Библиотека',
			href: '/',
			visual: <FiBookOpen aria-hidden />,
		},
		{
			value: 'studio' as const,
			label: 'Studio',
			href: '/ai',
			visual: <FiLayers aria-hidden />,
		},
	];

	return (
		<div className={styles.root}>
			<Link
				className={styles.brand}
				href='/'
				aria-label={`${name} — ${english ? 'home' : 'главная'}`}
				onClick={onNavigate}
			>
				<SiteHeaderLogo logo={logo} fallback={<FiCpu aria-hidden />} />
				<span className={styles.name}>{name}</span>
			</Link>
			<nav
				className={styles.segments}
				aria-label={english ? 'Site area' : 'Раздел сайта'}
			>
				{areas.map((item) => (
					<Link
						className={buttonClassName(
							area === item.value ? 'secondary' : 'ghost',
						)}
						key={item.value}
						href={item.href}
						aria-current={area === item.value ? 'true' : undefined}
						onClick={onNavigate}
					>
						{item.label}
					</Link>
				))}
			</nav>
			<Select
				id={`site-area-${id}`}
				className={styles.compact}
				label={english ? 'Site area' : 'Раздел сайта'}
				labelVisuallyHidden
				showSelectedVisual={false}
				value={area}
				options={areas.map(({ value, label, visual }) => ({
					value,
					label,
					visual,
				}))}
				onChange={(value) => {
					if (value === area) return;
					onNavigate?.();
					router.push(value === 'studio' ? '/ai' : '/');
				}}
			/>
		</div>
	);
}
