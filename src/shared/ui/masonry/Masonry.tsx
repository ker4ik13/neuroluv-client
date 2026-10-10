'use client';

import {
	Children,
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useRef,
} from 'react';
import { getMasonryLayout } from './layout';
import styles from './Masonry.module.scss';

export function Masonry({
	children,
	columns = 3,
}: {
	children: ReactNode;
	columns?: 1 | 2 | 3;
}) {
	const root = useRef<HTMLDivElement>(null);
	const items = Children.toArray(children);
	useLayoutEffect(() => {
		const element = root.current;
		if (!element) return;
		let frame = 0;
		const cells = Array.from(element.children) as HTMLDivElement[];
		const measure = () => {
			frame = 0;
			if (!element.isConnected || !element.clientWidth) return;
			const computed = getComputedStyle(element);
			const count = Math.min(columns, Number(computed.columnCount) || columns);
			const gap = parseFloat(computed.columnGap) || 0;
			const width = (element.clientWidth - gap * (count - 1)) / count;
			const widthValue = `${width}px`;
			cells.forEach((cell) => {
				if (cell.style.width !== widthValue) cell.style.width = widthValue;
			});
			const layout = getMasonryLayout(
				cells.map(
					(cell) => cell.firstElementChild?.getBoundingClientRect().height || 0,
				),
				count,
				width,
				gap,
			);
			cells.forEach((cell, index) => {
				cell.style.left = `${layout.positions[index].left}px`;
				cell.style.top = `${layout.positions[index].top}px`;
			});
			element.style.height = `${layout.height}px`;
			element.dataset.masonryReady = 'true';
		};
		measure();
		const observer = new ResizeObserver(() => {
			if (!frame) frame = requestAnimationFrame(measure);
		});
		observer.observe(element);
		cells.forEach((cell) => {
			if (cell.firstElementChild) observer.observe(cell.firstElementChild);
		});
		return () => {
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	}, [children, columns]);
	return (
		<div
			ref={root}
			className={styles.masonry}
			style={{ '--masonry-columns': columns } as CSSProperties}
			data-masonry
		>
			{items.map((item, index) => (
				<div
					className={styles.item}
					data-masonry-item={index}
					key={typeof item === 'object' && 'key' in item ? item.key : index}
				>
					{item}
				</div>
			))}
		</div>
	);
}
