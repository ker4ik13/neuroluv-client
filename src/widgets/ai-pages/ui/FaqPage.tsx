'use client';

import { useMemo, useState } from 'react';
import { FiMessageCircle, FiSearch } from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import { type AiFaqItem } from '@/shared/api/ai';
import { AI_SUPPORT_URL } from '@/shared/config/ai';
import { FaqAccordion } from '@/shared/ui/faq-accordion';
import { useAiResource } from '../model/api';
import styles from './AiPages.module.scss';
import { AiCard, AiLinkButton, AiPage, AiPageHeader, AsyncState } from './AiUi';

export function FaqPage() {
	const { locale, t } = useAiLocale();
	const faq = useAiResource<AiFaqItem[]>('/catalog/faq');
	const [search, setSearch] = useState('');
	const [category, setCategory] = useState('');
	const categories = useMemo(
		() =>
			Array.from(
				new Set((faq.data || []).map((item) => item.category).filter(Boolean)),
			) as string[],
		[faq.data],
	);
	const filtered = useMemo(() => {
		const query = search.trim().toLocaleLowerCase(locale);
		return (faq.data || [])
			.filter((item) => !category || item.category === category)
			.filter(
				(item) =>
					!query ||
					item.question.toLocaleLowerCase(locale).includes(query) ||
					item.answer.toLocaleLowerCase(locale).includes(query),
			)
			.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
	}, [category, faq.data, locale, search]);

	return (
		<AiPage>
			<AiPageHeader
				title={t('Частые вопросы', 'Frequently asked questions')}
				description={t(
					'Ответы о генерации, оплате и ваших работах в Studio.',
					'Answers about generation, payments and your Studio works.',
				)}
			/>

			<AiCard className={styles.faqSearchCard}>
				<label className={styles.searchField}>
					<FiSearch aria-hidden='true' />
					<span className={styles.visuallyHidden}>
						{t('Поиск по вопросам', 'Search questions')}
					</span>
					<input
						placeholder={t(
							'Например: когда вернутся кредиты',
							'For example: when are credits returned',
						)}
						type='search'
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</label>
				{categories.length ? (
					<div
						className={styles.categoryTabs}
						aria-label={t('Категории вопросов', 'Question categories')}
					>
						<button
							aria-pressed={!category}
							className={!category ? styles.categoryActive : ''}
							type='button'
							onClick={() => setCategory('')}
						>
							{t('Все', 'All')}
						</button>
						{categories.map((item) => (
							<button
								aria-pressed={category === item}
								className={category === item ? styles.categoryActive : ''}
								key={item}
								type='button'
								onClick={() => setCategory(item)}
							>
								{faqCategoryLabel(item, t)}
							</button>
						))}
					</div>
				) : null}
			</AiCard>

			<AsyncState
				error={faq.error}
				isEmpty={!filtered.length}
				isLoading={faq.isLoading}
				emptyTitle={
					faq.data?.length
						? t('По вашему запросу ничего нет', 'No matches found')
						: t(
								'Вопросы пока не опубликованы',
								'No questions have been published yet',
							)
				}
				emptyDescription={
					faq.data?.length
						? t(
								'Попробуйте сократить запрос или выбрать другую категорию.',
								'Try shortening your query or choosing another category.',
							)
						: t(
								'Раздел появится после публикации материалов в админке.',
								'This section will appear after content is published in the admin panel.',
							)
				}
				onRetry={faq.reload}
			>
				<AiCard className={styles.faqList}>
					<FaqAccordion
						key={category + search}
						plainText
						items={filtered.map((item) => ({
							id: item.id,
							title: item.question,
							answer: item.answer,
						}))}
					/>
				</AiCard>
			</AsyncState>

			<AiCard className={styles.supportCard}>
				<span>
					<FiMessageCircle aria-hidden='true' />
				</span>
				<div>
					<h2>{t('Не нашли ответ?', "Didn't find an answer?")}</h2>
					<p>
						{t(
							'Напишите команде поддержки и приложите ID запуска или платежа.',
							'Contact support and include the run or payment ID.',
						)}
					</p>
				</div>
				<AiLinkButton href={AI_SUPPORT_URL} variant='secondary'>
					{t('Написать в Telegram', 'Message us on Telegram')}
				</AiLinkButton>
			</AiCard>
		</AiPage>
	);
}

function faqCategoryLabel(
	category: string,
	t: (russian: string, english: string) => string,
): string {
	const labels: Record<string, [string, string]> = {
		generation: ['Генерации', 'Generation'],
		privacy: ['Приватность', 'Privacy'],
		storage: ['Хранение', 'Storage'],
		billing: ['Оплата', 'Billing'],
		support: ['Поддержка', 'Support'],
	};
	const copy = labels[category];
	return copy ? t(copy[0], copy[1]) : category;
}
