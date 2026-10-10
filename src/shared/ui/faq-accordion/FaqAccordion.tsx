'use client';

import { useId, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import styles from './FaqAccordion.module.scss';

export type FaqAccordionItem = {
	id: number | string;
	title: string;
	answer: string;
};

export function FaqAccordion({
	items,
	plainText = false,
}: {
	items: FaqAccordionItem[];
	plainText?: boolean;
}) {
	const groupId = useId();
	const [openIndex, setOpenIndex] = useState<number | null>(
		items.length ? 0 : null,
	);

	return (
		<div className={styles.accordion} data-faq-accordion>
			{items.map((item, index) => {
				const isOpen = index === openIndex;
				const questionId = `${groupId}-question-${item.id}-${index}`;
				const answerId = `${groupId}-answer-${item.id}-${index}`;
				return (
					<div
						className={styles.item}
						key={`${item.id}-${index}`}
						data-open={isOpen}
					>
						<button
							id={questionId}
							type='button'
							className={styles.question}
							aria-expanded={isOpen}
							aria-controls={answerId}
							onClick={() => setOpenIndex(isOpen ? null : index)}
						>
							<span>{item.title}</span>
							<FiPlus className={styles.toggle} aria-hidden='true' />
						</button>
						<div
							className={styles.panel}
							id={answerId}
							role='region'
							aria-labelledby={questionId}
							aria-hidden={!isOpen}
							inert={!isOpen}
						>
							<div className={styles.clip}>
								{plainText ? (
									<div className={styles.answer}>
										{item.answer
											.split('\n')
											.map((paragraph, paragraphIndex) => (
												<p key={paragraphIndex}>{paragraph}</p>
											))}
									</div>
								) : (
									<div
										className={styles.answer}
										dangerouslySetInnerHTML={{ __html: item.answer }}
									/>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
