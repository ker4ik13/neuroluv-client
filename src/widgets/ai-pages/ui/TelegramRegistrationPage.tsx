'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { FiArrowRight, FiUser } from 'react-icons/fi';

import { useAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	aiApiFetch,
	clearAiCsrfToken,
	type AiTelegramRegistration,
	type AiTelegramRegistrationResult,
} from '@/shared/api/ai';

import { getAiErrorMessage, useAiResource } from '../model/api';
import { AuthIntro } from './AuthPage';
import styles from './AiPages.module.scss';
import { AiButton, AiCard, AiPage, AsyncState, FieldMessage } from './AiUi';

export function TelegramRegistrationPage({
	initialReturnTo = '/ai',
}: {
	initialReturnTo?: string;
}) {
	const router = useRouter();
	const { t } = useAiLocale();
	const { refresh } = useAiSession();
	const registration = useAiResource<AiTelegramRegistration>('/auth/telegram/registration');
	const [termsAccepted, setTermsAccepted] = useState(false);
	const [privacyAccepted, setPrivacyAccepted] = useState(false);
	const [marketingConsent, setMarketingConsent] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const displayName = String(
			new FormData(event.currentTarget).get('displayName') || '',
		).trim();
		if (!displayName) {
			setError(t('Укажите имя', 'Enter your name'));
			return;
		}
		if (!termsAccepted || !privacyAccepted) {
			setError(
				t(
					'Подтвердите обязательные соглашения',
					'Accept the required agreements',
				),
			);
			return;
		}

		setIsSubmitting(true);
		setError(null);
		try {
			const result = await aiApiFetch<AiTelegramRegistrationResult>(
				'/auth/telegram/registration',
				{
					method: 'POST',
					body: {
						displayName,
						termsAccepted,
						privacyAccepted,
						marketingConsent,
					},
				},
			);
			clearAiCsrfToken();
			await refresh();
			router.replace(result.returnTo || registration.data?.returnTo || initialReturnTo);
		} catch (requestError) {
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<AiPage>
			<div className={styles.authLayout}>
				<AuthIntro />
				<AiCard className={styles.authCard}>
					<AsyncState
						emptyTitle={t('Регистрация не найдена', 'Registration not found')}
						error={registration.error}
						isEmpty={!registration.data}
						isLoading={registration.isLoading}
						onRetry={registration.reload}
					>
						{registration.data ? (
							<>
								<div className={styles.authTitle}>
									<h2>{t('Завершите регистрацию', 'Complete registration')}</h2>
									<p>
										{registration.data.telegramUsername
											? `Telegram: @${registration.data.telegramUsername}`
											: t(
													'Аккаунт Telegram подтверждён',
													'Telegram account verified',
												)}
									</p>
								</div>
								<form className={styles.formStack} onSubmit={handleSubmit}>
									<label className={styles.field}>
										<span>{t('Как к вам обращаться', 'Your name')}</span>
										<span className={styles.inputWrap}>
											<FiUser aria-hidden='true' />
											<input
												autoComplete='name'
												defaultValue={registration.data.displayName}
												maxLength={80}
												name='displayName'
												required
											/>
										</span>
									</label>

									<div className={styles.consentStack}>
										<ConsentCheckbox
											checked={termsAccepted}
											onChange={setTermsAccepted}
										>
											{t('Я принимаю', 'I accept the')}{' '}
											<LegalLink href='/legal/user-agreement'>
												{t('Пользовательское соглашение', 'User Agreement')}
											</LegalLink>
										</ConsentCheckbox>
										<ConsentCheckbox
											checked={privacyAccepted}
											onChange={setPrivacyAccepted}
										>
											{t('Я принимаю', 'I accept the')}{' '}
											<LegalLink href='/legal/personal-data-consent'>
												{t(
													'Согласие на обработку персональных данных',
													'Personal Data Consent',
												)}
											</LegalLink>{' '}
											{t('и ознакомлен с', 'and have read the')}{' '}
											<LegalLink href='/legal/personal-data-policy'>
												{t(
													'Политикой обработки персональных данных',
													'Personal Data Policy',
												)}
											</LegalLink>
										</ConsentCheckbox>
										<ConsentCheckbox
											checked={marketingConsent}
											onChange={setMarketingConsent}
											required={false}
										>
											{t(
												'Получать новости продукта и полезные материалы',
												'Receive product news and useful materials',
											)}
										</ConsentCheckbox>
									</div>

									{error ? <FieldMessage>{error}</FieldMessage> : null}
									<AiButton disabled={isSubmitting} type='submit'>
										{isSubmitting
											? t('Создаём аккаунт…', 'Creating account…')
											: t('Завершить регистрацию', 'Complete registration')}
										{!isSubmitting ? <FiArrowRight aria-hidden='true' /> : null}
									</AiButton>
								</form>
							</>
						) : null}
					</AsyncState>
				</AiCard>
			</div>
		</AiPage>
	);
}

function ConsentCheckbox({
	checked,
	children,
	onChange,
	required = true,
}: {
	checked: boolean;
	children: React.ReactNode;
	onChange: (checked: boolean) => void;
	required?: boolean;
}) {
	return (
		<label className={styles.consentField}>
			<input
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				required={required}
				type='checkbox'
			/>
			<span>{children}</span>
		</label>
	);
}

function LegalLink({ children, href }: { children: React.ReactNode; href: string }) {
	return (
		<Link
			className={styles.legalLink}
			href={href}
			rel='noreferrer'
			target='_blank'
		>
			{children}
		</Link>
	);
}
