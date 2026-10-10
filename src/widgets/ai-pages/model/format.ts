export function formatMoney(
	amountMinor: number,
	currency: string,
	locale = 'ru-RU',
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
		maximumFractionDigits: 2,
	}).format(amountMinor / 100);
}

export function formatMoneyPerCredit(
	amountMinor: number,
	credits: number,
	currency: string,
	locale = 'ru-RU',
): string {
	const unitAmount = credits > 0 ? amountMinor / credits / 100 : 0;
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(unitAmount);
}

export function formatDate(
	value: string,
	includeTime = false,
	locale = 'ru-RU',
): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return locale.startsWith('en') ? 'Date not specified' : 'Дата не указана';
	}

	return new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeZone: 'Europe/Moscow',
		...(includeTime ? { timeStyle: 'short' as const } : {}),
	}).format(date);
}

export function getStatusLabel(status: string, locale = 'ru-RU'): string {
	const labels: Record<string, [string, string]> = {
		queued: ['В очереди', 'Queued'],
		processing: ['В процессе', 'Processing'],
		succeeded: ['Готово', 'Ready'],
		partially_succeeded: ['Готово частично', 'Partially ready'],
		failed: ['Ошибка', 'Failed'],
		cancelled: ['Отменено', 'Cancelled'],
		refunded: ['Возвращено', 'Refunded'],
		pending: ['Ожидает', 'Pending'],
		active: ['Активно', 'Active'],
		inactive: ['Неактивна', 'Inactive'],
		archived: ['В архиве', 'Archived'],
		expired: ['Файл удалён', 'File deleted'],
		paid: ['Оплачено', 'Paid'],
		approved: ['Одобрено', 'Approved'],
		rejected: ['Отклонено', 'Rejected'],
		on_hold: ['На удержании', 'On hold'],
	};

	const label = labels[status];
	return label
		? label[locale.startsWith('en') ? 1 : 0]
		: status.replaceAll('_', ' ');
}

export function getStatusTone(
	status: string,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
	if (['succeeded', 'active', 'paid', 'approved'].includes(status)) {
		return 'success';
	}

	if (['failed', 'rejected'].includes(status)) {
		return 'danger';
	}

	if (
		['queued', 'pending', 'on_hold', 'partially_succeeded'].includes(status)
	) {
		return 'warning';
	}

	if (['processing'].includes(status)) {
		return 'info';
	}

	return 'neutral';
}
