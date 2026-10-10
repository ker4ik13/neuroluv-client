'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useId } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Noindex } from '@/shared/ui/noindex';
import { Select } from '@/shared/ui/select';
import styles from './ContentListControls.module.scss';

export type ContentListFilter = {
	id: string;
	label: string;
	href: string;
	isActive: boolean;
};

export type ContentListSortOption = {
	label: string;
	href: string;
	isActive: boolean;
	value: 'fresh' | 'old';
};

type ContentListControlsProps = {
	action: string;
	filters: ContentListFilter[];
	hasActiveExternalFilters?: boolean;
	hiddenInputs?: Record<string, string | null | undefined>;
	leadingLink?: {
		href: string;
		icon?: ReactNode;
		label: string;
	};
	mobileFilter?: ReactNode;
	resultLabel?: string;
	resetHref: string;
	searchDefaultValue?: string | null;
	searchLabel: string;
	searchPlaceholder: string;
	sortOptions: ContentListSortOption[];
};

export function ContentListControls({
	action,
	filters,
	hasActiveExternalFilters = false,
	hiddenInputs = {},
	leadingLink,
	mobileFilter,
	resultLabel,
	resetHref,
	searchDefaultValue,
	searchLabel,
	searchPlaceholder,
	sortOptions,
}: ContentListControlsProps) {
	const sortId = useId();
	const router = useRouter();
	const activeSort =
		sortOptions.find((option) => option.isActive) || sortOptions[0];
	const hasFilters = filters.length > 0;
	const hasActiveFilters =
		hasActiveExternalFilters ||
		Boolean(searchDefaultValue) ||
		Object.values(hiddenInputs).some(Boolean) ||
		filters.some((filter) => filter.isActive && filter.id !== 'all');

	return (
		<Noindex>
			<section className={styles.controls} data-nosnippet='true'>
				{(leadingLink || mobileFilter) && (
					<div className={styles.mobileTopActions}>
						{leadingLink && (
							<Link
								className={`${styles.leadingLink} ${styles.mobileLeadingLink}`}
								href={leadingLink.href}
							>
								{leadingLink.icon}
								{leadingLink.label}
							</Link>
						)}
						{mobileFilter}
					</div>
				)}

				<div className={styles.searchRow}>
					{leadingLink && (
						<Link
							className={`${styles.leadingLink} ${styles.desktopLeadingLink}`}
							href={leadingLink.href}
						>
							{leadingLink.icon}
							{leadingLink.label}
						</Link>
					)}

					<form action={action} className={styles.searchForm}>
						<span className={styles.searchField}>
							<input
								aria-label={searchLabel}
								defaultValue={searchDefaultValue || ''}
								name='q'
								placeholder={searchPlaceholder}
								type='search'
							/>
						</span>

						{Object.entries(hiddenInputs).map(([name, value]) =>
							value ? (
								<input key={name} name={name} type='hidden' value={value} />
							) : null,
						)}

						<button type='submit'>
							Найти
							<FiSearch aria-hidden='true' />
						</button>
					</form>
				</div>

				{hasFilters && (
					<div className={styles.filters} aria-label='Фильтры' role='list'>
						{filters.map((filter) => (
							<Link
								className={`${styles.filterButton} ${
									filter.isActive ? styles.filterButtonActive : ''
								}`}
								href={filter.href}
								key={filter.id}
							>
								{filter.label}
							</Link>
						))}
					</div>
				)}

				<div className={styles.metaRow}>
					{resultLabel && <p className={styles.resultLabel}>{resultLabel}</p>}

					<div className={styles.actions}>
						{hasActiveFilters ? (
							<Link className={styles.resetButton} href={resetHref}>
								Сбросить
							</Link>
						) : (
							<button className={styles.resetButton} disabled type='button'>
								Сбросить
							</button>
						)}

						<Select
							id={`catalog-sort-${sortId}`}
							label='Сортировка'
							labelVisuallyHidden
							className={styles.sortSelect}
							value={activeSort.value}
							options={sortOptions}
							onChange={(value) => {
								const option = sortOptions.find((item) => item.value === value);
								if (option) router.push(option.href);
							}}
						/>
					</div>
				</div>
			</section>
		</Noindex>
	);
}
