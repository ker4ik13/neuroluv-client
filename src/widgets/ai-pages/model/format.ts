export function formatMoney(amountMinor: number, currency: string): string {
	return new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(amountMinor / 100);
}

export function formatDate(value: string, includeTime = false): string {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return 'Дата не указана';
	}

	return new Intl.DateTimeFormat('ru-RU', {
		dateStyle: 'medium',
		...(includeTime ? { timeStyle: 'short' as const } : {}),
	}).format(date);
}

export function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		queued: 'В очереди',
		processing: 'В процессе',
		succeeded: 'Готово',
		partially_succeeded: 'Готово частично',
		failed: 'Ошибка',
		cancelled: 'Отменено',
		refunded: 'Возвращено',
		pending: 'Ожидает',
		active: 'Активно',
		inactive: 'Неактивна',
		archived: 'В архиве',
		expired: 'Файл удалён',
		paid: 'Выплачено',
		approved: 'Одобрено',
		rejected: 'Отклонено',
		on_hold: 'На удержании',
	};

	return labels[status] || status.replaceAll('_', ' ');
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
