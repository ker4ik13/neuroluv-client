'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
	FiArrowLeft,
	FiArrowRight,
	FiKey,
	FiLock,
	FiMail,
	FiSend,
	FiUser,
} from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	type AiApiEnvelope,
	aiApiFetch,
	type AiAuthProvider,
	type AiSession,
	type AiTwoFactorRequired,
	clearAiCsrfToken,
} from '@/shared/api/ai';
import { getAiErrorMessage, unwrapAiData, useAiResource } from '../model/api';
import styles from './AiPages.module.scss';
import { AiButton, AiCard, AiPage, FieldMessage } from './AiUi';

type AuthMode = 'login' | 'register';

type AuthPageProps = {
	initialAuthError?: string;
	initialReturnTo?: string;
};

export function AuthPage({
	initialAuthError,
	initialReturnTo = '/ai',
}: AuthPageProps = {}) {
	const router = useRouter();
	const { isEnglish, t } = useAiLocale();
	const { session, refresh } = useAiSession();
	const [mode, setMode] = useState<AuthMode>('login');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isTelegramRedirecting, setIsTelegramRedirecting] = useState(false);
	const [twoFactor, setTwoFactor] = useState<AiTwoFactorRequired | null>(null);
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [privacyAccepted, setPrivacyAccepted] = useState(false);
	const [error, setError] = useState<string | null>(() =>
		initialAuthError
			? getTelegramAuthErrorMessage(initialAuthError, isEnglish)
			: null,
	);
	const returnTo = initialReturnTo;
	const providers = useAiResource<AiAuthProvider[]>(
		`/auth/providers?returnTo=${encodeURIComponent(returnTo)}`,
	);

	useEffect(() => {
		if (session.authenticated) {
			router.replace(returnTo);
		}
	}, [returnTo, router, session.authenticated]);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const values = new FormData(form);
		const email = String(values.get('email') || '').trim();
		const password = String(values.get('password') || '');
		const passwordConfirmation = String(
			values.get('passwordConfirmation') || '',
		);
		const displayName = String(values.get('displayName') || '').trim();
		const marketingConsent = values.get('marketingConsent') === 'on';

		if (!email || !password || (mode === 'register' && !displayName)) {
			setError(
				t('Заполните обязательные поля', 'Complete all required fields'),
			);
			return;
		}
		if (mode === 'register' && password.length < 8) {
			setError(
				t(
					'Пароль должен содержать не менее 8 символов',
					'Password must be at least 8 characters long',
				),
			);
			return;
		}
		if (mode === 'register' && password !== passwordConfirmation) {
			setError(t('Пароли не совпадают', 'Passwords do not match'));
			return;
		}
		if (mode === 'register' && (!termsAccepted || !privacyAccepted)) {
			setError(
				t(
					'Подтвердите условия сервиса и политику обработки данных',
					'Accept the terms of service and privacy policy',
				),
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const payload = await aiApiFetch<
				| AiSession
				| AiTwoFactorRequired
				| AiApiEnvelope<AiSession | AiTwoFactorRequired>
			>(`/auth/${mode}`, {
				method: 'POST',
				body: {
					email,
					password,
					...(mode === 'register'
						? { displayName, termsAccepted, privacyAccepted, marketingConsent }
						: {}),
				},
			});

			const result = unwrapAiData(payload);
			if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
				form.reset();
				setTwoFactor(result);
				return;
			}
			clearAiCsrfToken();
			form.reset();
			if (mode === 'register') {
				setTermsAccepted(false);
				setPrivacyAccepted(false);
			}
			await refresh();
			router.replace(returnTo);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleTwoFactor(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!twoFactor) return;
		const code = String(
			new FormData(event.currentTarget).get('code') || '',
		).trim();
		if (!/^\d{6}$/.test(code)) {
			setError(t('Введите шестизначный код', 'Enter the six-digit code'));
			return;
		}

		setIsSubmitting(true);
		setError(null);
		try {
			await aiApiFetch<AiSession | AiApiEnvelope<AiSession>>(
				'/auth/two-factor/email/verify',
				{
					method: 'POST',
					body: { challengeId: twoFactor.challengeId, code },
				},
			);
			clearAiCsrfToken();
			await refresh();
			router.replace(returnTo);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsSubmitting(false);
		}
	}

	const telegram = providers.data?.find(
		(provider) => provider.code === 'telegram' && provider.available,
	);
	const emailPassword = providers.data?.find(
		(provider) => provider.code === 'email_password' && provider.available,
	);
	const emailRegistrationAvailable =
		emailPassword?.registrationAccess === 'open';
	const closedBetaRegistration =
		telegram?.registrationAccess === 'telegram_allowlist';

	function handleTelegramStart() {
		if (!telegram?.authorizationUrl) {
			return;
		}
		if (mode === 'register' && (!termsAccepted || !privacyAccepted)) {
			setError(
				t(
					'Подтвердите условия сервиса и политику обработки данных',
					'Accept the terms of service and privacy policy',
				),
			);
			return;
		}

		setError(null);
		setIsTelegramRedirecting(true);
		try {
			const authorizationUrl = new URL(telegram.authorizationUrl);
			if (mode === 'register') {
				authorizationUrl.searchParams.set('termsAccepted', 'true');
				authorizationUrl.searchParams.set('privacyAccepted', 'true');
			}
			window.location.assign(authorizationUrl.toString());
		} catch {
			setIsTelegramRedirecting(false);
			setError(
				t(
					'Некорректная ссылка входа через Telegram. Попробуйте позже.',
					'Invalid Telegram sign-in link. Please try again later.',
				),
			);
		}
	}

	if (twoFactor) {
		return (
			<AiPage>
				<div className={styles.authLayout}>
					<AuthIntro />
					<AiCard className={styles.authCard}>
						<button
							className={styles.textButton}
							type='button'
							onClick={() => {
								setTwoFactor(null);
								setError(null);
							}}
						>
							<FiArrowLeft aria-hidden='true' />{' '}
							{t('Назад ко входу', 'Back to sign in')}
						</button>
						<div className={styles.authTitle}>
							<h2>{t('Подтвердите вход', 'Confirm sign in')}</h2>
							<p>
								{t(
									`Мы отправили код на ${twoFactor.destinationHint}`,
									`We sent a code to ${twoFactor.destinationHint}`,
								)}
							</p>
						</div>
						<form className={styles.formStack} onSubmit={handleTwoFactor}>
							<label className={styles.field}>
								<span>{t('Код из письма', 'Email code')}</span>
								<span className={styles.inputWrap}>
									<FiKey aria-hidden='true' />
									<input
										autoComplete='one-time-code'
										autoFocus
										inputMode='numeric'
										maxLength={6}
										name='code'
										pattern='[0-9]{6}'
										placeholder='000000'
										required
									/>
								</span>
							</label>
							{error ? <FieldMessage>{error}</FieldMessage> : null}
							<AiButton disabled={isSubmitting} type='submit'>
								{isSubmitting
									? t('Проверяем…', 'Checking…')
									: t('Продолжить', 'Continue')}
								{!isSubmitting ? <FiArrowRight aria-hidden='true' /> : null}
							</AiButton>
						</form>
					</AiCard>
				</div>
			</AiPage>
		);
	}

	return (
		<AiPage>
			<div className={styles.authLayout}>
				<AuthIntro />

				<AiCard className={styles.authCard}>
					<div
						className={styles.segmented}
						role='tablist'
						aria-label={t('Тип формы', 'Form type')}
					>
						<button
							aria-selected={mode === 'login'}
							className={mode === 'login' ? styles.segmentActive : ''}
							role='tab'
							type='button'
							onClick={() => {
								setMode('login');
								setError(null);
							}}
						>
							{t('Вход', 'Sign in')}
						</button>
						<button
							aria-selected={mode === 'register'}
							className={mode === 'register' ? styles.segmentActive : ''}
							role='tab'
							type='button'
							onClick={() => {
								setMode('register');
								setError(null);
							}}
						>
							{t('Регистрация', 'Register')}
						</button>
					</div>

					<div className={styles.authTitle}>
						<h2>
							{mode === 'login'
								? t('С возвращением', 'Welcome back')
								: t('Создать аккаунт', 'Create account')}
						</h2>
						<p>
							{mode === 'login'
								? t(
										'Войдите по email или через Telegram',
										'Sign in with email or Telegram',
									)
								: closedBetaRegistration
									? t(
											'Регистрация доступна приглашённым участникам через Telegram',
											'Registration is available to invited participants via Telegram',
										)
									: t(
											'Начните работать с Нейролюб Studio',
											'Start using Neuroluv Studio',
										)}
						</p>
					</div>

					<form className={styles.formStack} noValidate onSubmit={handleSubmit}>
						{mode === 'register' && emailRegistrationAvailable ? (
							<label className={styles.field}>
								<span>{t('Как к вам обращаться', 'Your name')}</span>
								<span className={styles.inputWrap}>
									<FiUser aria-hidden='true' />
									<input
										autoComplete='name'
										name='displayName'
										placeholder={t('Имя', 'Name')}
										required
									/>
								</span>
							</label>
						) : null}

						{mode === 'login' || emailRegistrationAvailable ? (
							<>
								<label className={styles.field}>
									<span>Email</span>
									<span className={styles.inputWrap}>
										<FiMail aria-hidden='true' />
										<input
											autoComplete='email'
											inputMode='email'
											name='email'
											placeholder='name@example.ru'
											required
											type='email'
										/>
									</span>
								</label>

								<label className={styles.field}>
									<span>{t('Пароль', 'Password')}</span>
									<span className={styles.inputWrap}>
										<FiLock aria-hidden='true' />
										<input
											autoComplete={
												mode === 'login' ? 'current-password' : 'new-password'
											}
											maxLength={128}
											minLength={mode === 'register' ? 8 : undefined}
											name='password'
											placeholder={
												mode === 'register'
													? t('Не менее 8 символов', 'At least 8 characters')
													: t('Ваш пароль', 'Your password')
											}
											required
											type='password'
										/>
									</span>
								</label>
							</>
						) : null}
						{mode === 'register' && emailRegistrationAvailable ? (
							<label className={styles.field}>
								<span>{t('Повторите пароль', 'Confirm password')}</span>
								<span className={styles.inputWrap}>
									<FiLock aria-hidden='true' />
									<input
										autoComplete='new-password'
										maxLength={128}
										minLength={8}
										name='passwordConfirmation'
										placeholder={t(
											'Введите пароль ещё раз',
											'Enter the password again',
										)}
										required
										type='password'
									/>
								</span>
							</label>
						) : null}
						{mode === 'login' ? (
							<Link
								className={styles.formAuxLink}
								href='/ai/auth/reset-password'
							>
								{t('Забыли пароль?', 'Forgot password?')}
							</Link>
						) : null}

						{mode === 'register' ? (
							<div className={styles.consentStack}>
								<label className={styles.consentField}>
									<input
										checked={termsAccepted}
										name='termsAccepted'
										onChange={(event) => setTermsAccepted(event.target.checked)}
										required
										type='checkbox'
									/>
									<span>
										{t('Я принимаю', 'I accept the')}{' '}
										<Link
											className={styles.legalLink}
											href='/legal/user-agreement'
											rel='noreferrer'
											target='_blank'
										>
											{t('Пользовательское соглашение', 'User Agreement')}
										</Link>
									</span>
								</label>
								<label className={styles.consentField}>
									<input
										checked={privacyAccepted}
										name='privacyAccepted'
										onChange={(event) =>
											setPrivacyAccepted(event.target.checked)
										}
										required
										type='checkbox'
									/>
									<span>
										{t('Я принимаю', 'I accept the')}{' '}
										<Link
											className={styles.legalLink}
											href='/legal/personal-data-consent'
											rel='noreferrer'
											target='_blank'
										>
											{t(
												'Согласие на обработку персональных данных',
												'Personal Data Consent',
											)}
										</Link>{' '}
										{t('и ознакомлен с', 'and have read the')}{' '}
										<Link
											className={styles.legalLink}
											href='/legal/personal-data-policy'
											rel='noreferrer'
											target='_blank'
										>
											{t(
												'Политикой обработки персональных данных',
												'Personal Data Policy',
											)}
										</Link>
									</span>
								</label>
								{emailRegistrationAvailable ? (
									<label className={styles.consentField}>
										<input name='marketingConsent' type='checkbox' />
										<span>
											{t(
												'Получать новости продукта и полезные материалы. ',
												'Receive product news and useful materials. ',
											)}
											<Link
												className={styles.legalLink}
												href='/legal/marketing-consent'
												rel='noreferrer'
												target='_blank'
											>
												{t('Условия рассылки', 'Marketing consent')}
											</Link>
										</span>
									</label>
								) : null}
							</div>
						) : null}

						{error ? <FieldMessage>{error}</FieldMessage> : null}

						{mode === 'login' || emailRegistrationAvailable ? (
							<AiButton disabled={isSubmitting} type='submit'>
								{isSubmitting
									? t('Проверяем…', 'Checking…')
									: mode === 'login'
										? t('Войти', 'Sign in')
										: t('Зарегистрироваться', 'Register')}
								{!isSubmitting ? <FiArrowRight aria-hidden='true' /> : null}
							</AiButton>
						) : null}
					</form>

					{telegram?.authorizationUrl ? (
						<>
							{mode === 'login' || emailRegistrationAvailable ? (
								<div className={styles.divider}>{t('или', 'or')}</div>
							) : null}
							<button
								className={`${styles.button} ${styles.telegramButton}`}
								disabled={isTelegramRedirecting}
								onClick={handleTelegramStart}
								type='button'
							>
								<FiSend aria-hidden='true' />
								{isTelegramRedirecting
									? t('Переходим…', 'Redirecting…')
									: mode === 'login'
										? t('Войти через Telegram', 'Sign in with Telegram')
										: t(
												'Зарегистрироваться через Telegram',
												'Register with Telegram',
											)}
							</button>
						</>
					) : null}

					{providers.error ? (
						<p className={styles.subtleNotice}>
							{t(
								'Вход через внешние сервисы сейчас недоступен. Email-вход продолжает работать.',
								'External sign-in is currently unavailable. Email sign-in still works.',
							)}
						</p>
					) : null}

					<p className={styles.legalText}>
						{mode === 'register'
							? closedBetaRegistration
								? t(
										'Закрытая бета: доступ проверяется по Telegram ID.',
										'Closed beta: access is checked by Telegram ID.',
									)
								: t(
										'Обязательные согласия фиксируются при создании аккаунта. Рассылку можно отключить в профиле.',
										'Required consents are recorded when the account is created. Emails can be disabled in your profile.',
									)
							: t(
									'Входя, вы подтверждаете, что используете свой аккаунт.',
									'By signing in, you confirm that you are using your own account.',
								)}
					</p>
				</AiCard>
			</div>
		</AiPage>
	);
}

function AuthIntro() {
	const { t } = useAiLocale();

	return (
		<section className={styles.authIntro}>
			<span className={styles.eyebrow}>
				{t(
					'Один аккаунт для всей AI-студии',
					'One account for the entire AI studio',
				)}
			</span>
			<h1>
				{t(
					'Создавайте, сохраняйте и продолжайте с любого устройства',
					'Create, save and continue on any device',
				)}
			</h1>
			<p>
				{t(
					'Ваши черновики останутся в браузере, а история запусков, работы и кредиты будут доступны после входа.',
					'Your drafts stay in the browser, while runs, works and credits become available after sign-in.',
				)}
			</p>
			<div className={styles.authVisual} aria-hidden='true'>
				<span />
				<span />
				<span />
			</div>
		</section>
	);
}

function getTelegramAuthErrorMessage(code: string, isEnglish: boolean): string {
	const messages: Record<string, [string, string]> = {
		telegram_denied: [
			'Вы отменили вход через Telegram.',
			'You cancelled Telegram sign-in.',
		],
		telegram_invalid_callback: [
			'Telegram вернул неполный ответ. Попробуйте ещё раз.',
			'Telegram returned an incomplete response. Please try again.',
		],
		telegram_login_failed: [
			'Не удалось войти через Telegram. Попробуйте ещё раз.',
			'Unable to sign in with Telegram. Please try again.',
		],
		telegram_beta_access_required: [
			'Этот Telegram-аккаунт не добавлен в закрытый бета-тест.',
			'This Telegram account is not included in the closed beta.',
		],
		telegram_registration_consent_required: [
			'Для создания аккаунта через Telegram нужно принять условия сервиса и политику обработки данных.',
			'Accept the terms of service and privacy policy to create an account with Telegram.',
		],
		telegram_state_invalid: [
			'Сессия входа через Telegram истекла. Начните вход заново.',
			'The Telegram sign-in session expired. Start again.',
		],
		telegram_token_invalid: [
			'Не удалось подтвердить аккаунт Telegram. Начните вход заново.',
			'Unable to verify the Telegram account. Start again.',
		],
		telegram_unavailable: [
			'Telegram временно недоступен. Попробуйте позже.',
			'Telegram is temporarily unavailable. Please try again later.',
		],
	};

	const message = messages[code];
	return (
		message?.[isEnglish ? 1 : 0] ||
		(isEnglish
			? 'Unable to complete Telegram sign-in. Please try again.'
			: 'Не удалось завершить вход через Telegram. Попробуйте ещё раз.')
	);
}
