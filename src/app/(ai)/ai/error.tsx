'use client';

import { useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { AiButton, AiPage, AiPageHeader } from '@/widgets/ai-pages';

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('AI route render error', {
			digest: error.digest,
			message: error.message,
			name: error.name,
			stack: error.stack,
		});
	}, [error]);

	return (
		<AiPage>
			<AiPageHeader
				title='Не удалось открыть раздел'
				description={`Обновите данные. Если ошибка повторится, сообщите поддержке код: ${error.digest || 'без кода'}.`}
				actions={
					<AiButton onClick={reset}>
						<FiRefreshCw aria-hidden='true' /> Повторить
					</AiButton>
				}
			/>
		</AiPage>
	);
}
