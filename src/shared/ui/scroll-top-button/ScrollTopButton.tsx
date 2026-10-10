'use client';

import { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';
import styles from './ScrollTopButton.module.scss';

export function ScrollTopButton() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		function handleScroll() {
			setIsVisible(window.scrollY > 520);
		}

		handleScroll();
		window.addEventListener('scroll', handleScroll, { passive: true });

		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<button
			aria-label='Вернуться наверх'
			className={`${styles.button} ${isVisible ? styles.buttonVisible : ''}`}
			type='button'
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		>
			<FiArrowUp aria-hidden='true' />
		</button>
	);
}
