'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { FiCheckCircle, FiLock, FiMail } from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import { aiApiFetch, clearAiCsrfToken } from '@/shared/api/ai';
import { Breadcrumbs } from '@/shared/ui/breadcrumbs';
import { getAiErrorMessage } from '../model/api';
import styles from './AiPages.module.scss';
import { AiButton, AiCard, AiPage, FieldMessage } from './AiUi';

type AccountEmailActionPageProps =
	| { action: 'verify-email'; token: string | null }
	| { action: 'reset-password'; token: string | null };

export function AccountEmailActionPage(props: AccountEmailActionPageProps) {
	const { t } = useAiLocale();
	const { refresh } = useAiSession();
	const [pending, setPending] = useState(false);
	const [complete, setComplete] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function verifyEmail() {
		if (!props.token) {
			setError(
				t(
					'Ссылка подтверждения неполная',
					'The verification link is incomplete',
				),
			);
			return;
		}
		setPending(true);
		setError(null);
		try {
			await aiApiFetch('/auth/email-verification/confirm', {
				method: 'POST',
				body: { token: props.token },
			});
			await refresh();
			setComplete(true);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setPending(false);
		}
	}

	async function submitPasswordReset(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		setPending(true);
		setError(null);
		try {
			if (props.token) {
				const password = String(data.get('password') || '');
				const confirmation = String(data.get('confirmation') || '');
				if (password.length < 12) {
					throw new Error(
						t(
							'Пароль должен содержать не менее 12 символов',
							'Password must be at least 12 characters long',
						),
					);
				}
				if (password !== confirmation) {
					throw new Error(t('Пароли не совпадают', 'Passwords do not match'));
				}
				await aiApiFetch('/auth/password-reset/confirm', {
					method: 'POST',
					body: { token: props.token, password },
				});
				clearAiCsrfToken();
				await refresh();
			} else {
				const email = String(data.get('email') || '').trim();
				await aiApiFetch('/auth/password-reset/request', {
					method: 'POST',
					body: { email },
				});
			}
			form.reset();
			setComplete(true);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setPending(false);
		}
	}

	const verification = props.action === 'verify-email';
	const resetWithToken = !verification && Boolean(props.token);
	const title = verification
		? t('Подтверждение email', 'Email verification')
		: resetWithToken
			? t('Новый пароль', 'New password')
			: t('Восстановление пароля', 'Password recovery');

	return (
		<AiPage>
			<div className={styles.accountActionLayout}>
				<AiCard className={styles.accountActionCard}>
					<Breadcrumbs
						items={[
							{ label: 'Studio', href: '/ai' },
							{ label: t('Вход', 'Sign in'), href: '/ai/auth' },
							{ label: title },
						]}
					/>
					<div className={styles.accountActionIcon} aria-hidden='true'>
						{complete ? (
							<FiCheckCircle />
						) : verification ? (
							<FiMail />
						) : (
							<FiLock />
						)}
					</div>
					<div className={styles.authTitle}>
						<h1>{title}</h1>
						<p>
							{complete
								? verification
									? t(
											'Адрес подтверждён. Настройки безопасности обновлены.',
											'Your email has been confirmed and security settings updated.',
										)
									: resetWithToken
										? t(
												'Пароль изменён. Все прежние сессии завершены.',
												'Your password was changed and previous sessions were signed out.',
											)
										: t(
												'Если аккаунт существует, письмо уже отправлено.',
												'If the account exists, the email has been sent.',
											)
								: verification
									? t(
											'Нажмите кнопку, чтобы подтвердить адрес для аккаунта.',
											'Confirm the address for your account.',
										)
									: resetWithToken
										? t(
												'Придумайте новый пароль длиной не менее 12 символов.',
												'Choose a new password with at least 12 characters.',
											)
										: t(
												'Укажите email аккаунта. Мы отправим безопасную ссылку на 30 минут.',
												'Enter your account email. We will send a secure link valid for 30 minutes.',
											)}
						</p>
					</div>

					{complete ? (
						<Link
							className={`${styles.button} ${styles.button_primary}`}
							href={verification ? '/ai/profile' : '/ai/auth'}
						>
							{verification
								? t('Открыть профиль', 'Open profile')
								: t('Войти', 'Sign in')}
						</Link>
					) : verification ? (
						<>
							{error ? <FieldMessage>{error}</FieldMessage> : null}
							<AiButton
								disabled={pending || !props.token}
								onClick={() => void verifyEmail()}
							>
								{pending
									? t('Подтверждаем…', 'Confirming…')
									: t('Подтвердить email', 'Confirm email')}
							</AiButton>
						</>
					) : (
						<form className={styles.formStack} onSubmit={submitPasswordReset}>
							{props.token ? (
								<>
									<label className={styles.field}>
										<span>{t('Новый пароль', 'New password')}</span>
										<input
											autoComplete='new-password'
											minLength={12}
											name='password'
											required
											type='password'
										/>
									</label>
									<label className={styles.field}>
										<span>{t('Повторите пароль', 'Confirm password')}</span>
										<input
											autoComplete='new-password'
											minLength={12}
											name='confirmation'
											required
											type='password'
										/>
									</label>
								</>
							) : (
								<label className={styles.field}>
									<span>Email</span>
									<input
										autoComplete='email'
										maxLength={254}
										name='email'
										required
										type='email'
									/>
								</label>
							)}
							{error ? <FieldMessage>{error}</FieldMessage> : null}
							<AiButton disabled={pending} type='submit'>
								{pending
									? t('Отправляем…', 'Sending…')
									: props.token
										? t('Сохранить пароль', 'Save password')
										: t('Отправить ссылку', 'Send link')}
							</AiButton>
						</form>
					)}
				</AiCard>
			</div>
		</AiPage>
	);
}
