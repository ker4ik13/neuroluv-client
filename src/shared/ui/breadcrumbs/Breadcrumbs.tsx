import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import styles from './Breadcrumbs.module.scss';

export type BreadcrumbItem = { label: string; href?: string };
export function Breadcrumbs({
	items,
	className = '',
}: {
	items: BreadcrumbItem[];
	className?: string;
}) {
	if (!items.length) return null;
	return (
		<nav aria-label='Хлебные крошки' className={`${styles.nav} ${className}`}>
			<ol>
				{items.map((item, index) => (
					<li key={`${item.href || item.label}-${index}`}>
						{index > 0 && <FiChevronRight aria-hidden='true' />}
						{item.href && index < items.length - 1 ? (
							<Link href={item.href}>{item.label}</Link>
						) : (
							<span
								aria-current={index === items.length - 1 ? 'page' : undefined}
								title={item.label}
							>
								{item.label}
							</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
