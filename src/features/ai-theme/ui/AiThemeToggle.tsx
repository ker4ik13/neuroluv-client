'use client';

import { FiMoon, FiSun } from 'react-icons/fi';
import { useClientReady } from '@/shared/lib/dom/useClientReady';
import { useAiTheme } from '../model/AiThemeContext';
import styles from './AiThemeToggle.module.scss';

export function AiThemeToggle({
	showLabel = false,
	lightLabel = 'Светлая тема',
	darkLabel = 'Тёмная тема',
	switchToLightLabel = 'Включить светлую тему',
	switchToDarkLabel = 'Включить тёмную тему',
}: {
	showLabel?: boolean;
	lightLabel?: string;
	darkLabel?: string;
	switchToLightLabel?: string;
	switchToDarkLabel?: string;
}) {
	const { resolvedTheme, setTheme } = useAiTheme();
	const isClientReady = useClientReady();
	const isDark = resolvedTheme === 'dark';
	const label = isDark ? switchToLightLabel : switchToDarkLabel;
	return (
		<button
			aria-label={label}
			aria-pressed={isDark}
			className={styles.toggle}
			disabled={!isClientReady}
			onClick={() => setTheme(isDark ? 'light' : 'dark')}
			title={label}
			type='button'
		>
			{isDark ? <FiSun aria-hidden='true' /> : <FiMoon aria-hidden='true' />}
			{showLabel ? <span>{isDark ? darkLabel : lightLabel}</span> : null}
		</button>
	);
}
