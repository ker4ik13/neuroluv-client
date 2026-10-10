import type { ComponentPropsWithoutRef } from 'react';
import styles from './Button.module.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function buttonClassName(
	variant: ButtonVariant = 'primary',
	className = '',
) {
	return `${styles.button} ${styles[variant]} ${className}`;
}
export function Button({
	variant = 'primary',
	className = '',
	...props
}: ComponentPropsWithoutRef<'button'> & { variant?: ButtonVariant }) {
	return <button {...props} className={buttonClassName(variant, className)} />;
}
