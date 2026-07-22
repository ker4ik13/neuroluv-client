const CREDIT_NUMBER_OPTIONS = {
	maximumFractionDigits: 2,
} as const;

const creditNumberFormat = new Intl.NumberFormat(
	'ru-RU',
	CREDIT_NUMBER_OPTIONS,
);
const creditPluralRules = new Intl.PluralRules(
	'ru-RU',
	CREDIT_NUMBER_OPTIONS,
);

export function formatCreditNumber(value: number): string {
	return creditNumberFormat.format(value);
}

export function formatCredits(value: number): string {
	const category = creditPluralRules.select(Math.abs(value));
	const unit =
		category === 'one'
			? 'кредит'
			: category === 'few' || category === 'two' || category === 'other'
				? 'кредита'
				: 'кредитов';

	return `${formatCreditNumber(value)} ${unit}`;
}
