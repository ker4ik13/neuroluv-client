'use client';

import type { ReactNode } from 'react';
import styles from './SectionTabs.module.scss';

export function SectionTabs<Value extends string>({
	label,
	items,
	value,
	onChange,
	className = '',
}: {
	label: string;
	items: readonly { value: Value; label: string; icon?: ReactNode }[];
	value: Value;
	onChange: (value: Value) => void;
	className?: string;
}) {
	return (
		<nav className={`${styles.root} ${className}`} aria-label={label}>
			{items.map((item) => (
				<button
					key={item.value}
					type='button'
					aria-pressed={value === item.value}
					onClick={() => onChange(item.value)}
				>
					{item.icon}
					{item.label}
				</button>
			))}
		</nav>
	);
}
