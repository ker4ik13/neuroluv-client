import { Children, type CSSProperties, type ReactNode } from 'react';
import styles from './BalancedGrid.module.scss';
import { getBalancedGridSpans } from './layout';

export function BalancedGrid({
	children,
	className,
	maxColumns = 4,
}: {
	children: ReactNode;
	className?: string;
	maxColumns?: 2 | 3 | 4;
}) {
	const items = Children.toArray(children);
	const desktopSpans = getBalancedGridSpans(items.length, maxColumns);
	const tabletSpans = getBalancedGridSpans(items.length, 2);

	return (
		<div
			className={[styles.grid, className].filter(Boolean).join(' ')}
			data-balanced-grid
		>
			{items.map((item, index) => (
				<div
					className={styles.cell}
					key={typeof item === 'object' && 'key' in item ? item.key : index}
					style={
						{
							'--balanced-span': desktopSpans[index],
							'--balanced-tablet-span': tabletSpans[index],
						} as CSSProperties
					}
				>
					{item}
				</div>
			))}
		</div>
	);
}
