export type DirectusFaqQuestionJunction = {
	sort: number | null;
	faq_questions_id:
		| {
				id: number;
				title: string | null;
				description: string | null;
				is_active: boolean | null;
		  }
		| number
		| null;
};

export type DirectusContentFaq = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	description?: string | null;
	questions?: DirectusFaqQuestionJunction[];
};

export function buildDirectusFaqFields(prefix: string): string[] {
	return [
		`${prefix}.item:block_faq.id`,
		`${prefix}.item:block_faq.title`,
		`${prefix}.item:block_faq.description`,
		`${prefix}.item:block_faq.is_active`,
		`${prefix}.item:block_faq.questions.sort`,
		`${prefix}.item:block_faq.questions.faq_questions_id.id`,
		`${prefix}.item:block_faq.questions.faq_questions_id.title`,
		`${prefix}.item:block_faq.questions.faq_questions_id.description`,
		`${prefix}.item:block_faq.questions.faq_questions_id.is_active`,
	];
}

export function normalizeDirectusContentFaq(id: number, item: unknown) {
	if (!item || typeof item !== 'object') return null;
	const faq = item as DirectusContentFaq;
	if (faq.is_active === false) return null;
	const questions = normalizeFaqQuestions(
		Array.isArray(faq.questions) ? faq.questions : [],
	);
	return questions.length
		? {
				id,
				type: 'faq' as const,
				title: faq.title || null,
				description: faq.description || null,
				questions,
			}
		: null;
}

export function normalizeFaqQuestions(
	questions: DirectusFaqQuestionJunction[],
) {
	return [...questions]
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.flatMap(({ faq_questions_id: question }) =>
			question &&
			typeof question === 'object' &&
			question.is_active !== false &&
			question.title
				? [
						{
							id: question.id,
							title: question.title,
							answer: question.description || '',
						},
					]
				: [],
		);
}
