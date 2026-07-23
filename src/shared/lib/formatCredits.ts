const CREDIT_NUMBER_OPTIONS = {
	maximumFractionDigits: 2,
} as const;

export function formatCreditNumber(value: number, locale = 'ru-RU'): string {
	return new Intl.NumberFormat(locale, CREDIT_NUMBER_OPTIONS).format(value);
}

export function formatCredits(value: number, locale = 'ru-RU'): string {
	const category = new Intl.PluralRules(locale, CREDIT_NUMBER_OPTIONS).select(Math.abs(value));
	const unit = locale.startsWith('en')
		? category === 'one' ? 'credit' : 'credits'
		: category === 'one' ? 'кредит' : category === 'few' ? 'кредита' : 'кредитов';

	return `${formatCreditNumber(value, locale)} ${unit}`;
}
