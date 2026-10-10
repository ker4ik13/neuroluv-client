'use client';
import { FiClock, FiLoader } from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import type { AiRunSummary } from '@/shared/api/ai';
import styles from './RunState.module.scss';

export function RunState({ run }: { run: AiRunSummary | null | undefined }) {
	const { t } = useAiLocale();
	const queued = run?.status === 'queued';
	const progress =
		typeof run?.progress === 'number' && Number.isFinite(run.progress)
			? Math.max(0, Math.min(100, run.progress))
			: null;
	return (
		<div className={styles.state} role='status'>
			<div className={styles.caption}>
				{queued ? (
					<FiClock aria-hidden='true' />
				) : (
					<FiLoader aria-hidden='true' className={styles.spinner} />
				)}
				<span>
					{queued
						? t('В очереди', 'Queued')
						: t('Генерация выполняется', 'Generation in progress')}
					{queued && run?.queuePosition
						? ` · ${t('позиция', 'position')} ${run.queuePosition}`
						: ''}
				</span>
				{!queued && progress !== null && (
					<strong>{Math.round(progress)}%</strong>
				)}
			</div>
			{!queued && progress !== null && (
				<div
					className={styles.track}
					role='progressbar'
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progress}
					aria-label={t('Прогресс генерации', 'Generation progress')}
				>
					<span style={{ width: `${progress}%` }} />
				</div>
			)}
		</div>
	);
}
