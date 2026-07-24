'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
	FiBell,
	FiCheckCircle,
	FiClock,
	FiImage,
	FiKey,
	FiLock,
	FiLogOut,
	FiMail,
	FiMessageCircle,
	FiSave,
	FiSend,
	FiShield,
	FiUser,
	FiUsers,
} from 'react-icons/fi';
import { type AiLocale, useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	type AiApiEnvelope,
	aiApiFetch,
	type AiUserProfile,
	clearAiCsrfToken,
} from '@/shared/api/ai';
import { AI_SUPPORT_URL } from '@/shared/config/ai';
import { getAiErrorMessage, unwrapAiData, useAiResource } from '../model/api';
import styles from './AiPages.module.scss';
import { AiSelect } from './AiSelect';
import {
	AccountGate,
	AiButton,
	AiCard,
	AiLinkButton,
	AiPage,
	AiPageHeader,
	AsyncState,
	FieldMessage,
} from './AiUi';

export function ProfilePage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { setLocale, t } = useAiLocale();
	const { session, isLoading: isSessionLoading, refresh } = useAiSession();
	const profile = useAiResource<AiUserProfile>(
		session.authenticated ? '/profile' : null,
	);
	const [displayName, setDisplayName] = useState('');
	const [language, setLanguage] = useState<AiLocale>('ru-RU');
	const [marketingConsent, setMarketingConsent] = useState(false);
	const [productUpdates, setProductUpdates] = useState(false);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [identityPending, setIdentityPending] = useState(false);
	const [securityPending, setSecurityPending] = useState(false);
	const [securityError, setSecurityError] = useState<string | null>(null);
	const [securityNotice, setSecurityNotice] = useState<string | null>(null);
	const [twoFactorChallenge, setTwoFactorChallenge] = useState<{
		challengeId: string;
		destinationHint: string;
	} | null>(null);
	const identityNotice =
		searchParams.get('identityLinked') === 'telegram'
			? t('Telegram привязан к аккаунту', 'Telegram linked to account')
			: null;
	const identityError = searchParams.get('identityError')
		? t(
				'Не удалось привязать Telegram. Попробуйте ещё раз.',
				'Could not link Telegram. Please try again.',
			)
		: null;

	useEffect(() => {
		if (!profile.data) return;
		const data = profile.data;
		const timer = window.setTimeout(() => {
			setDisplayName(data.displayName);
			setLanguage(data.language === 'en-US' ? 'en-US' : 'ru-RU');
			setMarketingConsent(Boolean(data.marketingConsent));
			setProductUpdates(Boolean(data.productUpdates));
		}, 0);

		return () => window.clearTimeout(timer);
	}, [profile.data]);

	if (!isSessionLoading && !session.authenticated) {
		return (
			<AiPage>
				<AiPageHeader title={t('Профиль', 'Profile')} />
				<AccountGate returnTo='/ai/profile' />
			</AiPage>
		);
	}

	async function saveProfile(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!displayName.trim()) {
			setError(t('Укажите имя', 'Enter your name'));
			return;
		}

		setIsPending(true);
		setError(null);
		setNotice(null);
		try {
			const payload = await aiApiFetch<
				AiUserProfile | AiApiEnvelope<AiUserProfile>
			>('/profile', {
				method: 'PATCH',
				body: {
					displayName: displayName.trim(),
					locale: language,
					marketingConsent,
					emailProductNews: productUpdates,
				},
			});
			unwrapAiData(payload);
			setLocale(language);
			await refresh();
			profile.reload();
			setNotice(t('Настройки сохранены', 'Settings saved'));
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsPending(false);
		}
	}

	async function logout() {
		setIsPending(true);
		setError(null);
		try {
			await aiApiFetch('/auth/logout', { method: 'POST' });
			clearAiCsrfToken();
			await refresh();
			router.replace('/ai');
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsPending(false);
		}
	}

	async function linkTelegram() {
		setIdentityPending(true);
		setError(null);
		setNotice(null);
		try {
			const result = await aiApiFetch<{ authorizationUrl: string }>(
				'/auth/identities/telegram/start',
				{
					method: 'POST',
					body: { returnTo: '/ai/profile' },
				},
			);
			window.location.assign(result.authorizationUrl);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
			setIdentityPending(false);
		}
	}

	async function linkEmailPassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const email = String(data.get('email') || '').trim();
		const password = String(data.get('password') || '');
		const passwordConfirmation = String(data.get('passwordConfirmation') || '');

		if (password !== passwordConfirmation) {
			setError(t('Пароли не совпадают', 'Passwords do not match'));
			return;
		}

		setIdentityPending(true);
		setError(null);
		setNotice(null);
		try {
			await aiApiFetch('/auth/identities/email-password', {
				method: 'POST',
				body: { email, password },
			});
			form.reset();
			await Promise.all([refresh(), profile.reload()]);
			setNotice(
				t(
					'Email и пароль привязаны. Письмо с подтверждением отправлено.',
					'Email and password linked. A verification email has been sent.',
				),
			);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIdentityPending(false);
		}
	}

	async function requestEmailVerification() {
		setSecurityPending(true);
		setSecurityError(null);
		setSecurityNotice(null);
		try {
			const result = await aiApiFetch<{ alreadyVerified: boolean }>(
				'/auth/email-verification/request',
				{ method: 'POST' },
			);
			if (result.alreadyVerified) {
				await profile.reload();
				setSecurityNotice(
					t('Email уже подтверждён', 'Email is already verified'),
				);
			} else {
				setSecurityNotice(
					t(
						'Письмо отправлено. Проверьте входящие и спам.',
						'Email sent. Check your inbox and spam folder.',
					),
				);
			}
		} catch (requestError) {
			setSecurityError(getAiErrorMessage(requestError));
		} finally {
			setSecurityPending(false);
		}
	}

	async function requestTwoFactorEnable() {
		setSecurityPending(true);
		setSecurityError(null);
		setSecurityNotice(null);
		try {
			const result = await aiApiFetch<{
				challengeId: string;
				destinationHint: string;
			}>('/auth/two-factor/email/enable/request', { method: 'POST' });
			setTwoFactorChallenge(result);
			setSecurityNotice(
				t(
					`Код отправлен на ${result.destinationHint}`,
					`Code sent to ${result.destinationHint}`,
				),
			);
		} catch (requestError) {
			setSecurityError(getAiErrorMessage(requestError));
		} finally {
			setSecurityPending(false);
		}
	}

	async function confirmTwoFactorEnable(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!twoFactorChallenge) return;
		const form = event.currentTarget;
		const code = String(new FormData(form).get('code') || '').trim();
		setSecurityPending(true);
		setSecurityError(null);
		try {
			await aiApiFetch('/auth/two-factor/email/enable/confirm', {
				method: 'POST',
				body: { challengeId: twoFactorChallenge.challengeId, code },
			});
			form.reset();
			setTwoFactorChallenge(null);
			await profile.reload();
			setSecurityNotice(
				t('Двухфакторная защита включена', 'Two-factor authentication enabled'),
			);
		} catch (requestError) {
			setSecurityError(getAiErrorMessage(requestError));
		} finally {
			setSecurityPending(false);
		}
	}

	async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const currentPassword = String(
			new FormData(form).get('currentPassword') || '',
		);
		setSecurityPending(true);
		setSecurityError(null);
		try {
			await aiApiFetch('/auth/two-factor/email/disable', {
				method: 'POST',
				body: { currentPassword },
			});
			form.reset();
			await profile.reload();
			setSecurityNotice(
				t(
					'Двухфакторная защита отключена',
					'Two-factor authentication disabled',
				),
			);
		} catch (requestError) {
			setSecurityError(getAiErrorMessage(requestError));
		} finally {
			setSecurityPending(false);
		}
	}

	async function changePassword(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		const currentPassword = String(data.get('currentPassword') || '');
		const newPassword = String(data.get('newPassword') || '');
		const confirmation = String(data.get('confirmation') || '');
		if (newPassword !== confirmation) {
			setSecurityError(t('Пароли не совпадают', 'Passwords do not match'));
			return;
		}
		setSecurityPending(true);
		setSecurityError(null);
		try {
			await aiApiFetch('/auth/password/change', {
				method: 'POST',
				body: { currentPassword, newPassword },
			});
			form.reset();
			setSecurityNotice(
				t(
					'Пароль изменён. Остальные сессии завершены.',
					'Password changed. Other sessions were signed out.',
				),
			);
		} catch (requestError) {
			setSecurityError(getAiErrorMessage(requestError));
		} finally {
			setSecurityPending(false);
		}
	}

	return (
		<AiPage>
			<AiPageHeader
				title={t('Профиль', 'Profile')}
				actions={
					<AiButton
						disabled={isPending}
						variant='ghost'
						onClick={() => void logout()}
					>
						<FiLogOut aria-hidden='true' /> {t('Выйти', 'Sign out')}
					</AiButton>
				}
			/>

			<AsyncState
				error={profile.error}
				isEmpty={!profile.data}
				isLoading={isSessionLoading || profile.isLoading}
				onRetry={profile.reload}
			>
				{profile.data ? (
					<div className={styles.profileGrid}>
						<AiCard className={styles.profileSummary}>
							<div className={styles.avatarLarge}>
								{profile.data.avatarUrl ? (
									// eslint-disable-next-line @next/next/no-img-element -- user CDN URL
									<img alt='' src={profile.data.avatarUrl} />
								) : (
									<FiUser aria-hidden='true' />
								)}
							</div>
							<h2>{profile.data.displayName}</h2>
							{profile.data.email ? (
								<p>
									<FiMail aria-hidden='true' /> {profile.data.email}
								</p>
							) : null}
							{profile.data.telegramUsername ? (
								<p>
									<FiSend aria-hidden='true' /> @{profile.data.telegramUsername}
								</p>
							) : null}
							<div className={styles.profileQuickLinks}>
								<AiLinkButton href='/ai/works' variant='secondary'>
									<FiImage aria-hidden='true' /> {t('Мои работы', 'My works')}
								</AiLinkButton>
								<AiLinkButton href='/ai/history' variant='secondary'>
									<FiClock aria-hidden='true' /> {t('История', 'History')}
								</AiLinkButton>
								<AiLinkButton href='/ai/referrals' variant='secondary'>
									<FiUsers aria-hidden='true' />{' '}
									{t('Партнёрская программа', 'Affiliate program')}
								</AiLinkButton>
								<AiLinkButton href='/ai/faq' variant='ghost'>
									{t('Помощь и FAQ', 'Help and FAQ')}
								</AiLinkButton>
								<AiLinkButton href={AI_SUPPORT_URL} variant='ghost'>
									<FiMessageCircle aria-hidden='true' />{' '}
									{t('Обратная связь', 'Feedback')}
								</AiLinkButton>
								<AiLinkButton href={AI_SUPPORT_URL} variant='ghost'>
									<FiSend aria-hidden='true' /> {t('Поддержка', 'Support')}
								</AiLinkButton>
							</div>
						</AiCard>

						<div className={styles.profileSettingsColumn}>
							<AiCard className={styles.profileFormCard}>
								<form className={styles.formStack} onSubmit={saveProfile}>
									<div className={styles.cardTitleRow}>
										<div>
											<h2>{t('Настройки', 'Settings')}</h2>
											<p>
												{t(
													'Изменения применятся ко всем устройствам.',
													'Changes apply to all devices.',
												)}
											</p>
										</div>
										<FiShield aria-hidden='true' />
									</div>
									<label className={styles.field}>
										<span>{t('Имя', 'Name')}</span>
										<input
											maxLength={120}
											required
											value={displayName}
											onChange={(event) => setDisplayName(event.target.value)}
										/>
									</label>
									<AiSelect<AiLocale>
										id='profile-language'
										label={t('Язык интерфейса', 'Interface language')}
										options={[
											{ value: 'ru-RU', label: 'Русский' },
											{ value: 'en-US', label: 'English' },
										]}
										value={language}
										onChange={(nextLanguage) => {
											setLanguage(nextLanguage);
											setLocale(nextLanguage);
										}}
									/>
									<div className={styles.preferenceGroup}>
										<div className={styles.preferenceTitle}>
											<FiBell aria-hidden='true' />
											<div>
												<h3>{t('Уведомления', 'Notifications')}</h3>
												<p>
													{t(
														'Вы можете изменить выбор в любой момент.',
														'You can change these settings at any time.',
													)}
												</p>
											</div>
										</div>
										<label className={styles.toggleField}>
											<input
												checked={productUpdates}
												type='checkbox'
												onChange={(event) =>
													setProductUpdates(event.target.checked)
												}
											/>
											<span aria-hidden='true' />
											<strong>
												{t(
													'Статусы генераций и важные обновления сервиса',
													'Generation statuses and important service updates',
												)}
											</strong>
										</label>
										<label className={styles.toggleField}>
											<input
												checked={marketingConsent}
												type='checkbox'
												onChange={(event) =>
													setMarketingConsent(event.target.checked)
												}
											/>
											<span aria-hidden='true' />
											<strong>
												{t(
													'Полезные подборки и новости Нейролюба',
													'Useful collections and Neuroluv news',
												)}
											</strong>
										</label>
										<Link
											className={styles.legalLink}
											href='/legal/marketing-consent'
										>
											{t(
												'Согласие на информационные и рекламные рассылки',
												'Marketing communications consent',
											)}
										</Link>
									</div>
									{notice || identityNotice ? (
										<FieldMessage tone='success'>
											{notice || identityNotice}
										</FieldMessage>
									) : null}
									{error || identityError ? (
										<FieldMessage>{error || identityError}</FieldMessage>
									) : null}
									<AiButton disabled={isPending} type='submit'>
										<FiSave aria-hidden='true' />{' '}
										{isPending
											? t('Сохраняем…', 'Saving…')
											: t('Сохранить', 'Save')}
									</AiButton>
								</form>
							</AiCard>

							<AiCard className={styles.profileFormCard}>
								<div className={styles.cardTitleRow}>
									<div>
										<h2>{t('Способы входа', 'Sign-in methods')}</h2>
										<p>
											{t(
												'После привязки можно входить любым из доступных способов.',
												'After linking, you can use any available sign-in method.',
											)}
										</p>
									</div>
									<FiShield aria-hidden='true' />
								</div>

								<div className={styles.identityMethods}>
									<div className={styles.identityMethod}>
										<div>
											<strong>
												<FiSend aria-hidden='true' /> Telegram
											</strong>
											<small>
												{profile.data.authMethods.telegram
													? t('Привязан к аккаунту', 'Linked to account')
													: t('Не привязан', 'Not linked')}
											</small>
										</div>
										{!profile.data.authMethods.telegram ? (
											<AiButton
												disabled={identityPending}
												type='button'
												variant='secondary'
												onClick={() => void linkTelegram()}
											>
												{t('Привязать', 'Link')}
											</AiButton>
										) : null}
									</div>

									<div className={styles.identityMethod}>
										<div>
											<strong>
												<FiMail aria-hidden='true' /> Email
											</strong>
											<small>
												{profile.data.authMethods.emailPassword
													? t(
															'Email и пароль настроены',
															'Email and password configured',
														)
													: t(
															'Добавьте email и пароль для альтернативного входа',
															'Add email and password for alternative sign-in',
														)}
											</small>
										</div>
										{profile.data.authMethods.emailPassword ? (
											profile.data.authMethods.emailVerified ? (
												<span
													className={`${styles.status} ${styles.status_success}`}
												>
													<FiCheckCircle aria-hidden='true' />{' '}
													{t('Подтверждён', 'Verified')}
												</span>
											) : (
												<AiButton
													disabled={securityPending}
													type='button'
													variant='secondary'
													onClick={() => void requestEmailVerification()}
												>
													{t('Подтвердить', 'Verify')}
												</AiButton>
											)
										) : null}
									</div>

									{!profile.data.authMethods.emailPassword ? (
										<form
											className={styles.formStack}
											onSubmit={linkEmailPassword}
										>
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
											<label className={styles.field}>
												<span>{t('Пароль', 'Password')}</span>
												<input
													autoComplete='new-password'
													minLength={12}
													maxLength={128}
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
													maxLength={128}
													name='passwordConfirmation'
													required
													type='password'
												/>
											</label>
											<AiButton disabled={identityPending} type='submit'>
												<FiMail aria-hidden='true' />
												{identityPending
													? t('Сохраняем…', 'Saving…')
													: t('Привязать email', 'Link email')}
											</AiButton>
										</form>
									) : null}
								</div>
							</AiCard>

							{profile.data.authMethods.emailPassword ? (
								<AiCard className={styles.profileFormCard}>
									<div className={styles.cardTitleRow}>
										<div>
											<h2>{t('Безопасность', 'Security')}</h2>
											<p>
												{t(
													'Пароль и подтверждение входа одноразовым кодом.',
													'Password and one-time email verification codes.',
												)}
											</p>
										</div>
										<FiShield aria-hidden='true' />
									</div>

									<div className={styles.securitySections}>
										<section>
											<div className={styles.securitySectionTitle}>
												<div>
													<strong>
														<FiKey aria-hidden='true' />{' '}
														{t(
															'Двухфакторная защита',
															'Two-factor authentication',
														)}
													</strong>
													<small>
														{profile.data.authMethods.emailTwoFactorEnabled
															? t(
																	'При входе по email потребуется код из письма.',
																	'Email sign-in requires a one-time code.',
																)
															: t(
																	'Защитите вход дополнительным кодом.',
																	'Protect sign-in with an additional code.',
																)}
													</small>
												</div>
												<span
													className={`${styles.status} ${profile.data.authMethods.emailTwoFactorEnabled ? styles.status_success : styles.status_neutral}`}
												>
													{profile.data.authMethods.emailTwoFactorEnabled
														? t('Включена', 'Enabled')
														: t('Выключена', 'Disabled')}
												</span>
											</div>

											{!profile.data.authMethods.emailVerified ? (
												<FieldMessage tone='notice'>
													{t(
														'Сначала подтвердите email.',
														'Verify your email first.',
													)}
												</FieldMessage>
											) : profile.data.authMethods.emailTwoFactorEnabled ? (
												<form
													className={styles.inlineSecurityForm}
													onSubmit={disableTwoFactor}
												>
													<label className={styles.field}>
														<span>
															{t('Текущий пароль', 'Current password')}
														</span>
														<input
															autoComplete='current-password'
															name='currentPassword'
															required
															type='password'
														/>
													</label>
													<AiButton
														disabled={securityPending}
														type='submit'
														variant='secondary'
													>
														{t('Отключить', 'Disable')}
													</AiButton>
												</form>
											) : twoFactorChallenge ? (
												<form
													className={styles.inlineSecurityForm}
													onSubmit={confirmTwoFactorEnable}
												>
													<label className={styles.field}>
														<span>{t('Код из письма', 'Email code')}</span>
														<input
															autoComplete='one-time-code'
															inputMode='numeric'
															maxLength={6}
															name='code'
															pattern='[0-9]{6}'
															required
														/>
													</label>
													<AiButton disabled={securityPending} type='submit'>
														{t('Подтвердить', 'Confirm')}
													</AiButton>
												</form>
											) : (
												<AiButton
													disabled={securityPending}
													type='button'
													variant='secondary'
													onClick={() => void requestTwoFactorEnable()}
												>
													{t(
														'Включить двухфакторную защиту',
														'Enable two-factor authentication',
													)}
												</AiButton>
											)}
										</section>

										<section>
											<div className={styles.securitySectionTitle}>
												<div>
													<strong>
														<FiLock aria-hidden='true' />{' '}
														{t('Изменить пароль', 'Change password')}
													</strong>
													<small>
														{t(
															'После смены остальные сессии будут завершены.',
															'Other sessions will be signed out.',
														)}
													</small>
												</div>
											</div>
											<form
												className={styles.securityPasswordGrid}
												onSubmit={changePassword}
											>
												<label className={styles.field}>
													<span>{t('Текущий пароль', 'Current password')}</span>
													<input
														autoComplete='current-password'
														name='currentPassword'
														required
														type='password'
													/>
												</label>
												<label className={styles.field}>
													<span>{t('Новый пароль', 'New password')}</span>
													<input
														autoComplete='new-password'
														minLength={12}
														name='newPassword'
														required
														type='password'
													/>
												</label>
												<label className={styles.field}>
													<span>
														{t('Повторите пароль', 'Confirm password')}
													</span>
													<input
														autoComplete='new-password'
														minLength={12}
														name='confirmation'
														required
														type='password'
													/>
												</label>
												<AiButton disabled={securityPending} type='submit'>
													{t('Сменить пароль', 'Change password')}
												</AiButton>
											</form>
										</section>

										{securityNotice ? (
											<FieldMessage tone='success'>
												{securityNotice}
											</FieldMessage>
										) : null}
										{securityError ? (
											<FieldMessage>{securityError}</FieldMessage>
										) : null}
									</div>
								</AiCard>
							) : null}
						</div>
					</div>
				) : null}
			</AsyncState>
		</AiPage>
	);
}
