'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
	FiCheck,
	FiClock,
	FiCreditCard,
	FiExternalLink,
	FiGift,
	FiLock,
	FiShield,
	FiUsers,
	FiZap,
} from 'react-icons/fi';
import {
	AI_PAYMENT_UPDATED_EVENT,
	rememberPendingPayment,
} from '@/features/ai-browser-notifications';
import { useAiLocale, withAiLocale } from '@/features/ai-locale';
import { useAiSession } from '@/features/ai-session';
import {
	type AiActivePromo,
	type AiApiEnvelope,
	AiApiError,
	aiApiFetch,
	type AiBillingProducts,
	type AiPage as AiPageData,
	type AiPaymentProvider,
	type AiPaymentSummary,
	type AiPlan,
	type AiPromoActivationResult,
	type AiPromoQuote,
	type AiReferralStats,
	type AiTopupPackage,
	type AiWalletSummary,
} from '@/shared/api/ai';
import { useFocusTrap } from '@/shared/lib/dom/useFocusTrap';
import { formatCredits } from '@/shared/lib/formatCredits';
import { SectionTabs } from '@/shared/ui/section-tabs';
import { getAiErrorMessage, unwrapAiData, useAiResource } from '../model/api';
import { formatDate, formatMoney, formatMoneyPerCredit } from '../model/format';
import styles from './AiPages.module.scss';
import {
	AiButton,
	AiCard,
	AiLinkButton,
	AiPage,
	AiPageHeader,
	AsyncState,
	FieldMessage,
	ReceiptState,
	StatusBadge,
} from './AiUi';
import { PlanCard } from './PlanCard';

type CheckoutProduct =
	| { type: 'subscription'; value: AiPlan }
	| { type: 'topup'; value: AiTopupPackage };

type BillingPeriod = Extract<AiPlan['interval'], 'month' | 'year'>;
type SubscriptionActivationMode = 'immediate' | 'after_current_period';

export function BalancePage({
	initialPlanId,
}: { initialPlanId?: string } = {}) {
	const { locale, t } = useAiLocale();
	const {
		session,
		isLoading: isSessionLoading,
		refresh: refreshSession,
	} = useAiSession();
	const wallet = useAiResource<AiWalletSummary>(
		session.authenticated ? '/wallet/balance' : null,
	);
	const products = useAiResource<AiBillingProducts>(
		isSessionLoading ? null : '/billing/products',
	);
	const payments = useAiResource<AiPageData<AiPaymentSummary>>(
		session.authenticated ? '/billing/payments?page=1&pageSize=10' : null,
	);
	const referrals = useAiResource<AiReferralStats>(
		session.authenticated ? '/referrals' : null,
	);
	const [checkoutProduct, setCheckoutProduct] =
		useState<CheckoutProduct | null>(null);
	const [selectedBillingPeriod, setBillingPeriod] =
		useState<BillingPeriod | null>(null);
	const [view, setView] = useState<'subscriptions' | 'topups' | 'payments'>(
		'subscriptions',
	);
	const [paymentProviderId, setPaymentProviderId] = useState('');
	const [activationMode, setActivationMode] =
		useState<SubscriptionActivationMode | null>(null);
	const [isPending, setIsPending] = useState(false);
	const [isPromoPending, setIsPromoPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [promoCode, setPromoCode] = useState('');
	const [promoQuote, setPromoQuote] = useState<AiPromoQuote | null>(null);
	const [promoError, setPromoError] = useState<string | null>(null);
	const [activationPromoCode, setActivationPromoCode] = useState('');
	const [activationPromoPending, setActivationPromoPending] = useState(false);
	const [activationPromoError, setActivationPromoError] = useState<
		string | null
	>(null);
	const checkoutIntent = useRef<{ signature: string; key: string } | null>(
		null,
	);
	const focusedPlanId = useRef<string | null>(null);
	const checkoutDialogRef = useRef<HTMLDivElement>(null);
	const refreshPayments = payments.refresh;
	const refreshProducts = products.refresh;
	const refreshWallet = wallet.refresh;

	useFocusTrap(Boolean(checkoutProduct), checkoutDialogRef);

	useEffect(() => {
		const onPaymentUpdated = (event: Event) => {
			const payment = (event as CustomEvent<AiPaymentSummary>).detail;
			if (!payment?.id) return;

			void Promise.all([
				refreshWallet(),
				refreshProducts(),
				refreshPayments(),
				refreshSession(),
			]);
			if (['paid', 'succeeded'].includes(payment.status)) {
				setError(null);
				setNotice(
					payment.activationMode === 'after_current_period' &&
						payment.activationState === 'scheduled'
						? t(
								`Оплата прошла успешно. Новый тариф включится ${formatDate(payment.activationScheduledFor ?? '', false, locale)}, тогда же начислятся его кредиты.`,
								`Payment completed. The new plan will start on ${formatDate(payment.activationScheduledFor ?? '', false, locale)} and its credits will be added then.`,
							)
						: payment.credits && payment.credits > 0
							? t(
									`Оплата прошла успешно. Начислено ${formatCredits(payment.credits, locale)}.`,
									`Payment completed. ${formatCredits(payment.credits, locale)} added.`,
								)
							: t(
									'Оплата прошла успешно. Баланс обновлён.',
									'Payment completed. Your balance has been updated.',
								),
				);
			} else if (
				['canceled', 'cancelled', 'expired', 'failed'].includes(payment.status)
			) {
				setNotice(null);
				setError(
					t(
						'Платёж не был завершён. Средства не списаны.',
						'The payment was not completed. No funds were charged.',
					),
				);
			}
		};

		window.addEventListener(AI_PAYMENT_UPDATED_EVENT, onPaymentUpdated);
		return () =>
			window.removeEventListener(AI_PAYMENT_UPDATED_EVENT, onPaymentUpdated);
	}, [
		locale,
		refreshPayments,
		refreshProducts,
		refreshSession,
		refreshWallet,
		t,
	]);

	useEffect(() => {
		if (!checkoutProduct) return;
		const previousOverflow = document.body.style.overflow;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setCheckoutProduct(null);
		};
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [checkoutProduct]);

	const compatibleProviders = useMemo(() => {
		if (!checkoutProduct || !products.data) return [];
		return products.data.paymentProviders.filter(
			(provider) =>
				provider.available &&
				provider.currencies.includes(checkoutProduct.value.currency),
		);
	}, [checkoutProduct, products.data]);
	const activeProviderId = compatibleProviders.some(
		(provider) => provider.id === paymentProviderId,
	)
		? paymentProviderId
		: compatibleProviders[0]?.id || '';
	const activePlanId = products.data?.subscription.planId ?? null;
	const scheduledSubscription = products.data?.scheduledSubscription ?? null;
	const requiresActivationChoice = Boolean(
		checkoutProduct?.type === 'subscription' &&
		activePlanId &&
		checkoutProduct.value.id !== activePlanId,
	);
	const authReturnHref = `/ai/auth?returnTo=${encodeURIComponent(initialPlanId ? `/ai/balance?plan=${encodeURIComponent(initialPlanId)}` : '/ai/balance')}`;
	const activePlan = useMemo(
		() => products.data?.plans.find((plan) => plan.id === activePlanId) ?? null,
		[activePlanId, products.data?.plans],
	);
	const requestedPeriod = products.data?.plans.find(
		(plan) => plan.id === initialPlanId,
	)?.interval;
	const fallbackPeriod =
		requestedPeriod === 'month' || requestedPeriod === 'year'
			? requestedPeriod
			: activePlan?.interval === 'year'
				? 'year'
				: 'month';
	const billingPeriod = selectedBillingPeriod ?? fallbackPeriod;
	const visiblePlans = useMemo(
		() =>
			products.data?.plans.filter((plan) => plan.interval === billingPeriod) ??
			[],
		[billingPeriod, products.data?.plans],
	);

	useEffect(() => {
		if (!initialPlanId || focusedPlanId.current === initialPlanId) return;
		const plan = products.data?.plans.find((item) => item.id === initialPlanId);
		if (!plan || (plan.interval !== 'month' && plan.interval !== 'year'))
			return;
		const timer = window.setTimeout(() => {
			const card = document.getElementById(`plan-${plan.id}`);
			if (!card) return;
			focusedPlanId.current = plan.id;
			card.scrollIntoView({ block: 'center', behavior: 'instant' });
			card.focus({ preventScroll: true });
		}, 100);
		return () => window.clearTimeout(timer);
	}, [initialPlanId, products.data?.plans, billingPeriod]);

	function closeCheckout() {
		setCheckoutProduct(null);
		setActivationMode(null);
		setError(null);
		setPromoCode('');
		setPromoQuote(null);
		setPromoError(null);
	}

	function openCheckout(product: CheckoutProduct) {
		if (product.type === 'subscription' && scheduledSubscription) {
			return;
		}
		setPaymentProviderId('');
		setActivationMode(
			product.type === 'subscription' && !activePlanId ? 'immediate' : null,
		);
		const activePromoCode = products.data?.activePromo?.code ?? '';
		setPromoCode(activePromoCode);
		setPromoQuote(null);
		setPromoError(null);
		setError(null);
		setCheckoutProduct(product);
		if (activePromoCode) {
			void requestPromoQuote(activePromoCode, product);
		}
	}

	async function startCheckout() {
		if (!checkoutProduct || !activeProviderId) {
			setError(
				t(
					'Выберите доступный способ оплаты',
					'Choose an available payment method',
				),
			);
			return;
		}
		if (requiresActivationChoice && !activationMode) {
			setError(
				t(
					'Выберите, когда активировать новый тариф',
					'Choose when to activate the new plan',
				),
			);
			return;
		}

		setIsPending(true);
		setError(null);
		setNotice(null);
		try {
			const signature = [
				checkoutProduct.type,
				checkoutProduct.value.id,
				activeProviderId,
				promoQuote?.code || '',
				activationMode || 'extend',
			].join(':');
			if (checkoutIntent.current?.signature !== signature) {
				checkoutIntent.current = { signature, key: crypto.randomUUID() };
			}
			const payload = await aiApiFetch<
				| { checkoutUrl: string | null; paymentId: string }
				| AiApiEnvelope<{ checkoutUrl: string | null; paymentId: string }>
			>('/billing/checkout', {
				method: 'POST',
				headers: { 'idempotency-key': checkoutIntent.current.key },
				// The backend may safely retry an idempotent YooKassa request three
				// times during a transient network stall.
				timeoutMs: 70_000,
				body: {
					productType: checkoutProduct.type,
					productId: checkoutProduct.value.id,
					providerId: activeProviderId,
					...(checkoutProduct.type === 'subscription' && activationMode
						? { activationMode }
						: {}),
					...(promoQuote ? { promoCode: promoQuote.code } : {}),
				},
			});
			const checkout = unwrapAiData(payload);
			if (!checkout.checkoutUrl) {
				checkoutIntent.current = null;
				closeCheckout();
				setNotice(
					t(
						'Платёж создан. Обновите статус через несколько секунд.',
						'Payment created. Refresh its status in a few seconds.',
					),
				);
				payments.reload();
				return;
			}
			const url = new URL(checkout.checkoutUrl, window.location.origin);

			if (!['http:', 'https:'].includes(url.protocol)) {
				throw new Error(
					t(
						'Платёжный сервис вернул некорректную ссылку',
						'The payment service returned an invalid URL',
					),
				);
			}
			checkoutIntent.current = null;
			rememberPendingPayment(checkout.paymentId);
			window.location.assign(url.toString());
		} catch (requestError) {
			if (
				requestError instanceof AiApiError &&
				requestError.problem.status < 500
			) {
				checkoutIntent.current = null;
			}
			setError(getAiErrorMessage(requestError));
		} finally {
			setIsPending(false);
		}
	}

	async function applyPromo(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!checkoutProduct) return;
		const code = promoCode.trim();
		if (!code) {
			setPromoError(t('Введите промокод', 'Enter a promo code'));
			return;
		}

		await requestPromoQuote(code, checkoutProduct);
	}

	async function requestPromoQuote(code: string, product: CheckoutProduct) {
		setIsPromoPending(true);
		setPromoError(null);
		setPromoQuote(null);
		try {
			const payload = await aiApiFetch<
				AiPromoQuote | AiApiEnvelope<AiPromoQuote>
			>('/billing/promo/apply', {
				method: 'POST',
				body: {
					code,
					productType: product.type,
					productId: product.value.id,
				},
			});
			const quote = unwrapAiData(payload);
			setPromoCode(quote.code);
			setPromoQuote(quote);
			checkoutIntent.current = null;
		} catch (requestError) {
			setPromoError(getAiErrorMessage(requestError));
		} finally {
			setIsPromoPending(false);
		}
	}

	async function activatePromo(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const code = activationPromoCode.trim();
		if (!code) {
			setActivationPromoError(t('Введите промокод', 'Enter a promo code'));
			return;
		}
		setActivationPromoPending(true);
		setActivationPromoError(null);
		setNotice(null);
		try {
			const payload = await aiApiFetch<
				AiPromoActivationResult | AiApiEnvelope<AiPromoActivationResult>
			>('/billing/promo/activate', {
				method: 'POST',
				headers: { 'idempotency-key': crypto.randomUUID() },
				body: { code },
			});
			const result = unwrapAiData(payload);
			setActivationPromoCode('');
			await Promise.all([refreshWallet(), refreshProducts(), refreshSession()]);
			setNotice(
				result.status === 'credited'
					? t(
							`Промокод применён: начислено ${formatCredits(result.bonusCredits, locale)}.`,
							`Promo code applied: ${formatCredits(result.bonusCredits, locale)} added.`,
						)
					: result.status === 'used'
						? t(
								'Этот промокод уже был использован.',
								'This promo code has already been used.',
							)
						: t(
								'Промокод активирован и автоматически применится к подходящей покупке.',
								'The promo code is active and will be applied to an eligible purchase automatically.',
							),
			);
		} catch (requestError) {
			setActivationPromoError(getAiErrorMessage(requestError));
		} finally {
			setActivationPromoPending(false);
		}
	}

	const loadError =
		products.error || (session.authenticated ? wallet.error : null);
	const isPricingEmpty =
		!products.data || (session.authenticated && !wallet.data);
	const isPricingLoading =
		isSessionLoading ||
		products.isLoading ||
		(session.authenticated && wallet.isLoading);

	return (
		<AiPage>
			<AiPageHeader
				title={
					session.authenticated
						? t('Баланс', 'Balance')
						: t('Тарифы Нейролюб Studio', 'Neuroluv Studio plans')
				}
				description={
					!session.authenticated
						? t(
								'Текст, изображения и видео — с одним балансом. Подберите тариф под свои задачи.',
								'Text, images and video with a shared balance. Choose a plan for your projects.',
							)
						: undefined
				}
			/>
			{!isSessionLoading && !session.authenticated ? (
				<div className={styles.guestPricingIntro}>
					<p>
						{t(
							'После создания аккаунта вы сможете сохранять работы, продолжать чаты и выбрать подходящий тариф.',
							'Create an account to save your work, continue chats and choose a plan.',
						)}
					</p>
					<div>
						<AiLinkButton
							href={withAiLocale(
								`/ai/auth?mode=register&returnTo=${encodeURIComponent('/ai/balance')}`,
								locale,
							)}
						>
							{t('Создать аккаунт', 'Create account')}
						</AiLinkButton>
						<AiLinkButton href={authReturnHref} variant='ghost'>
							{t('Войти', 'Sign in')}
						</AiLinkButton>
					</div>
				</div>
			) : null}
			{notice ? <FieldMessage tone='success'>{notice}</FieldMessage> : null}
			{error && !checkoutProduct ? <FieldMessage>{error}</FieldMessage> : null}

			<AsyncState
				error={loadError}
				isEmpty={isPricingEmpty}
				isLoading={isPricingLoading}
				onRetry={() => {
					if (session.authenticated) wallet.reload();
					products.reload();
				}}
			>
				{products.data && (!session.authenticated || wallet.data) ? (
					<>
						{session.authenticated && wallet.data ? (
							<>
								<div className={styles.balanceHeroGrid}>
									<AiCard className={styles.balanceMainCard}>
										<span className={styles.balanceIcon}>
											<FiZap aria-hidden='true' />
										</span>
										<p>{t('Доступно сейчас', 'Available now')}</p>
										<strong>
											{formatCredits(wallet.data.availableCredits, locale)}
										</strong>
										{wallet.data.reservedCredits > 0 ||
										wallet.data.lockedCredits > 0 ? (
											<div className={styles.balanceBreakdown}>
												{wallet.data.reservedCredits > 0 ? (
													<span>
														<small>{t('Зарезервировано', 'Reserved')}</small>
														{formatCredits(wallet.data.reservedCredits, locale)}
													</span>
												) : null}
												{wallet.data.lockedCredits > 0 ? (
													<span>
														<small>
															{t(
																'Временно заблокировано',
																'Temporarily locked',
															)}
														</small>
														{formatCredits(wallet.data.lockedCredits, locale)}
													</span>
												) : null}
											</div>
										) : null}
									</AiCard>

									<AiCard className={styles.subscriptionCard}>
										<div className={styles.subscriptionHeading}>
											<span className={styles.balanceIcon}>
												<FiShield aria-hidden='true' />
											</span>
											<StatusBadge
												status={
													products.data.subscription.active
														? 'active'
														: 'inactive'
												}
											/>
										</div>
										<h2>
											{products.data.subscription.planName ||
												t('Нет активной подписки', 'No active subscription')}
										</h2>
										{products.data.subscription.active ? (
											<>
												<p>
													{t('Активна до', 'Active until')}{' '}
													{products.data.subscription.periodEndsAt
														? formatDate(
																products.data.subscription.periodEndsAt,
																false,
																locale,
															)
														: t(
																'конца оплаченного периода',
																'the end of the paid period',
															)}
												</p>
												<div className={styles.subscriptionFooter}>
													<span>
														{t('Продление вручную', 'Manual renewal')}
													</span>
												</div>
												{scheduledSubscription ? (
													<p>
														{t('Следующий тариф', 'Next plan')}:{' '}
														<strong>
															{scheduledSubscription.planName ||
																t('Выбранный тариф', 'Selected plan')}
														</strong>{' '}
														· {t('с', 'from')}{' '}
														{formatDate(
															scheduledSubscription.startsAt,
															false,
															locale,
														)}
													</p>
												) : null}
											</>
										) : (
											<p>
												{t(
													'Запуски и использование ранее купленных разовых кредитов станут доступны после подключения подписки.',
													'Runs and previously purchased top-up credits become available after subscribing.',
												)}
											</p>
										)}
									</AiCard>
								</div>
								<AiCard className={styles.promoActivationCard}>
									<div>
										<span className={styles.balanceIcon}>
											<FiGift aria-hidden='true' />
										</span>
										<div>
											<h2>{t('Промокод', 'Promo code')}</h2>
											<p>
												{t(
													'Введите код отдельно: бонусные кредиты начислятся сразу, а скидка сохранится до следующей подходящей покупки.',
													'Enter a code separately: bonus credits are added immediately, while a discount is saved for the next eligible purchase.',
												)}
											</p>
										</div>
									</div>
									<form
										className={styles.checkoutPromo}
										onSubmit={(event) => void activatePromo(event)}
									>
										<div>
											<input
												aria-label={t('Промокод', 'Promo code')}
												maxLength={64}
												placeholder={t('Введите промокод', 'Enter promo code')}
												value={activationPromoCode}
												onChange={(event) => {
													setActivationPromoCode(event.target.value);
													setActivationPromoError(null);
												}}
											/>
											<AiButton
												disabled={
													activationPromoPending || !activationPromoCode.trim()
												}
												type='submit'
												variant='secondary'
											>
												{activationPromoPending
													? t('Применяем…', 'Applying…')
													: t('Применить', 'Apply')}
											</AiButton>
										</div>
										{activationPromoError ? (
											<FieldMessage>{activationPromoError}</FieldMessage>
										) : null}
									</form>
									{products.data.activePromo ? (
										<div className={styles.activePromoBadge}>
											<FiCheck aria-hidden='true' />
											<span>
												{t('Активен', 'Active')}:{' '}
												<b>{products.data.activePromo.code}</b>
												{' · '}
												{formatActivePromo(products.data.activePromo, locale)}
											</span>
										</div>
									) : null}
								</AiCard>
							</>
						) : null}

						<SectionTabs<'subscriptions' | 'topups' | 'payments'>
							label={t('Разделы баланса', 'Balance sections')}
							className={styles.balanceNavigation}
							value={view}
							onChange={setView}
							items={[
								{
									value: 'subscriptions',
									label: t('Подписки', 'Subscriptions'),
								},
								{ value: 'topups', label: t('Пополнение', 'Top up') },
								...(session.authenticated
									? [
											{
												value: 'payments' as const,
												label: t('История платежей', 'Payment history'),
											},
										]
									: []),
							]}
						/>
						<section
							className={styles.productSection}
							hidden={view !== 'subscriptions'}
						>
							<div className={styles.sectionTitleRow}>
								<h2>{t('Подписки', 'Subscriptions')}</h2>
								<div
									aria-label={t('Период подписки', 'Subscription period')}
									className={styles.billingPeriodToggle}
									role='group'
								>
									<button
										aria-pressed={billingPeriod === 'month'}
										className={
											billingPeriod === 'month'
												? styles.billingPeriodActive
												: undefined
										}
										type='button'
										onClick={() => setBillingPeriod('month')}
									>
										{t('Месяц', 'Month')}
									</button>
									<button
										aria-pressed={billingPeriod === 'year'}
										className={
											billingPeriod === 'year'
												? styles.billingPeriodActive
												: undefined
										}
										type='button'
										onClick={() => setBillingPeriod('year')}
									>
										{t('Год', 'Year')} <small>−10%</small>
									</button>
								</div>
							</div>
							{visiblePlans.length ? (
								<div className={styles.planGrid}>
									{visiblePlans.map((plan) => {
										const isActivePlan = plan.id === activePlanId;
										const isScheduledPlan =
											plan.id === scheduledSubscription?.planId;

										return (
											<PlanCard
												id={`plan-${plan.id}`}
												tabIndex={-1}
												aria-current={isActivePlan ? 'true' : undefined}
												key={plan.id}
												plan={plan}
												locale={locale}
												featured={Boolean(plan.badge && !isActivePlan)}
												active={isActivePlan}
												badgeLabel={
													isScheduledPlan
														? t('Запланирован', 'Scheduled')
														: isActivePlan
															? t('Активный тариф', 'Active plan')
															: plan.badge
												}
												action={
													session.authenticated ? (
														<AiButton
															disabled={Boolean(scheduledSubscription)}
															title={
																scheduledSubscription
																	? t(
																			'Сначала дождитесь активации уже оплаченного тарифа',
																			'Wait for the already paid plan to activate first',
																		)
																	: undefined
															}
															variant='secondary'
															onClick={() =>
																openCheckout({
																	type: 'subscription',
																	value: plan,
																})
															}
														>
															{isActivePlan ? (
																<>
																	<FiCreditCard aria-hidden='true' />
																	{t('Продлить', 'Extend')}
																</>
															) : (
																<>{t('Выбрать', 'Choose')} </>
															)}
														</AiButton>
													) : (
														<AiLinkButton
															href={withAiLocale(
																`/ai/auth?returnTo=${encodeURIComponent(`/ai/balance?plan=${plan.id}`)}`,
																locale,
															)}
															variant='secondary'
														>
															{t('Войти и выбрать', 'Sign in to choose')}{' '}
														</AiLinkButton>
													)
												}
											/>
										);
									})}
								</div>
							) : (
								<AiCard className={styles.inlineEmpty}>
									{t(
										'Подписки пока не опубликованы администратором.',
										'No subscriptions have been published yet.',
									)}
								</AiCard>
							)}
						</section>

						<section
							className={styles.productSection}
							hidden={view !== 'topups'}
						>
							<div className={styles.sectionTitleRow}>
								<h2>{t('Разовые пакеты', 'Credit packs')}</h2>
							</div>
							{products.data.topups.length ? (
								<div className={styles.topupGrid}>
									{products.data.topups.map((topup) => (
										<AiCard className={styles.topupCard} key={topup.id}>
											<FiGift aria-hidden='true' />
											<div>
												{!isCreditCountName(topup.name) ? (
													<h3>{topup.name}</h3>
												) : null}
												<strong>{formatCredits(topup.credits, locale)}</strong>
												<small className={styles.topupUnitPrice}>
													{t('1 кредит', '1 credit')} ={' '}
													{formatMoneyPerCredit(
														topup.amountMinor,
														topup.credits,
														topup.currency,
														locale,
													)}
												</small>
											</div>
											<span>
												{formatMoney(topup.amountMinor, topup.currency, locale)}
											</span>
											{session.authenticated ? (
												<AiButton
													className={styles.topupAction}
													disabled={
														!topup.eligible ||
														!products.data?.subscription.active
													}
													variant='secondary'
													onClick={() =>
														openCheckout({ type: 'topup', value: topup })
													}
												>
													{!topup.eligible ? (
														<FiLock aria-hidden='true' />
													) : (
														<FiCreditCard aria-hidden='true' />
													)}
													{t('Купить', 'Buy')}
												</AiButton>
											) : (
												<AiLinkButton
													className={styles.topupAction}
													href={authReturnHref}
													variant='secondary'
												>
													<FiLock aria-hidden='true' />
													{t('Войти для покупки', 'Sign in to purchase')}
												</AiLinkButton>
											)}
											{!topup.eligible && topup.ineligibleReason ? (
												<small>{topup.ineligibleReason}</small>
											) : null}
										</AiCard>
									))}
								</div>
							) : (
								<AiCard className={styles.inlineEmpty}>
									{t(
										'Пакеты пополнения пока не опубликованы.',
										'No credit packs have been published yet.',
									)}
								</AiCard>
							)}
						</section>

						{session.authenticated ? (
							<div
								className={styles.balanceLowerGrid}
								hidden={view !== 'payments'}
							>
								<AiCard className={styles.referralPaymentCard}>
									<span>
										<FiUsers aria-hidden='true' />
									</span>
									<div>
										<h2>{t('Партнёрская программа', 'Referral program')}</h2>
										<p>
											{referrals.data?.referrerPercent
												? t(
														`Получайте ${referrals.data.referrerPercent}% со всех покупок приглашённого пользователя в течение ${referrals.data.commissionMonths || 12} месяцев.`,
														`Earn ${referrals.data.referrerPercent}% from every purchase made by an invited user for ${referrals.data.commissionMonths || 12} months.`,
													)
												: t(
														'Приглашайте друзей и получайте процент с их покупок в течение первого года.',
														'Invite friends and earn a percentage of their purchases during the first year.',
													)}
										</p>
									</div>
									<AiLinkButton
										className={styles.referralPaymentAction}
										href='/ai/referrals'
										variant='secondary'
									>
										{t('Подробнее', 'Learn more')}{' '}
									</AiLinkButton>
								</AiCard>

								<AiCard className={styles.paymentHistoryCard}>
									<div className={styles.cardTitleRow}>
										<h2>{t('Последние платежи', 'Recent payments')}</h2>
										<FiClock aria-hidden='true' />
									</div>
									{payments.isLoading ? (
										<div className={styles.miniSkeleton} />
									) : null}
									{payments.error ? (
										<FieldMessage>{payments.error}</FieldMessage>
									) : null}
									{!payments.isLoading && !payments.data?.data.length ? (
										<p>{t('Платежей пока нет.', 'No payments yet.')}</p>
									) : null}
									<div className={styles.paymentList}>
										{payments.data?.data.map((payment) => (
											<div className={styles.paymentRow} key={payment.id}>
												<div>
													<strong>{payment.title}</strong>
													<small>
														{formatDate(payment.createdAt, false, locale)}
													</small>
												</div>
												<div>
													<strong>
														{formatMoney(
															payment.amountMinor,
															payment.currency,
															locale,
														)}
													</strong>
													<StatusBadge status={payment.status} />
													<ReceiptState
														status={payment.receiptStatus}
														url={payment.receiptUrl}
													/>
												</div>
											</div>
										))}
									</div>
								</AiCard>
							</div>
						) : null}
					</>
				) : null}
			</AsyncState>

			{checkoutProduct ? (
				<div
					className={styles.modalBackdrop}
					role='presentation'
					onMouseDown={closeCheckout}
				>
					<div
						aria-labelledby='checkout-title'
						aria-modal='true'
						className={styles.modal}
						ref={checkoutDialogRef}
						role='dialog'
						tabIndex={-1}
						onMouseDown={(event) => event.stopPropagation()}
					>
						<h2 id='checkout-title'>{t('Способ оплаты', 'Payment method')}</h2>
						<p>
							{checkoutProduct.value.name} ·{' '}
							{formatMoney(
								promoQuote?.finalAmountMinor ??
									checkoutProduct.value.amountMinor,
								checkoutProduct.value.currency,
								locale,
							)}
							{checkoutProduct.type === 'subscription'
								? ` ${checkoutProduct.value.priceSuffix}`
								: ''}
						</p>
						{requiresActivationChoice ? (
							<div className={styles.consentStack}>
								<strong>
									{t(
										'Когда активировать тариф?',
										'When should the plan start?',
									)}
								</strong>
								<label className={styles.consentField}>
									<input
										checked={activationMode === 'immediate'}
										name='subscription-activation-mode'
										type='radio'
										onChange={() => {
											setActivationMode('immediate');
											checkoutIntent.current = null;
										}}
									/>
									<span>
										<strong>
											{t('Сразу после оплаты', 'Immediately after payment')}
										</strong>
										<br />
										{t(
											'Текущий тариф завершится, новый начнётся сразу. Неиспользованные кредиты сохранятся.',
											'The current plan will end and the new one will start immediately. Unused credits will remain.',
										)}
									</span>
								</label>
								<label className={styles.consentField}>
									<input
										checked={activationMode === 'after_current_period'}
										name='subscription-activation-mode'
										type='radio'
										onChange={() => {
											setActivationMode('after_current_period');
											checkoutIntent.current = null;
										}}
									/>
									<span>
										<strong>
											{t('После текущего тарифа', 'After the current plan')}
										</strong>
										<br />
										{t('Новый тариф начнётся', 'The new plan will start')}{' '}
										{formatDate(
											products.data?.subscription.periodEndsAt ?? '',
											false,
											locale,
										)}
										.{' '}
										{t(
											'Его кредиты начислятся при активации.',
											'Its credits will be added on activation.',
										)}
									</span>
								</label>
							</div>
						) : null}
						{compatibleProviders.length ? (
							<div className={styles.providerList}>
								{compatibleProviders.map((provider, index) => (
									<ProviderChoice
										autoFocus={index === 0}
										checked={provider.id === activeProviderId}
										key={provider.id}
										provider={provider}
										onChange={() => {
											setPaymentProviderId(provider.id);
										}}
									/>
								))}
							</div>
						) : (
							<FieldMessage>
								{t(
									'Для этой валюты сейчас нет доступного способа оплаты.',
									'No payment method is currently available for this currency.',
								)}
							</FieldMessage>
						)}
						<form
							className={styles.checkoutPromo}
							onSubmit={(event) => void applyPromo(event)}
						>
							<label htmlFor='checkout-promo'>
								{t('Промокод', 'Promo code')}
							</label>
							<div>
								<input
									id='checkout-promo'
									maxLength={64}
									placeholder={t('Введите код', 'Enter code')}
									value={promoCode}
									onChange={(event) => {
										setPromoCode(event.target.value);
										setPromoQuote(null);
										setPromoError(null);
										checkoutIntent.current = null;
									}}
								/>
								<AiButton
									disabled={isPromoPending || !promoCode.trim()}
									type='submit'
									variant='secondary'
								>
									{isPromoPending
										? t('Проверяем…', 'Checking…')
										: t('Применить', 'Apply')}
								</AiButton>
							</div>
							{promoQuote ? (
								<div className={styles.promoSummary}>
									{promoQuote.discountMinor > 0 ? (
										<span>
											{t('Скидка', 'Discount')}
											<strong>
												−
												{formatMoney(
													promoQuote.discountMinor,
													promoQuote.currency,
													locale,
												)}
											</strong>
										</span>
									) : null}
									{promoQuote.bonusCredits > 0 ? (
										<span>
											{t('Бонус', 'Bonus')}
											<strong>
												+{formatCredits(promoQuote.bonusCredits, locale)}
											</strong>
										</span>
									) : null}
								</div>
							) : null}
							{promoError ? <FieldMessage>{promoError}</FieldMessage> : null}
						</form>
						{error ? <FieldMessage>{error}</FieldMessage> : null}
						<div className={styles.modalActions}>
							<AiButton
								disabled={
									isPending ||
									!activeProviderId ||
									(requiresActivationChoice && !activationMode)
								}
								onClick={() => void startCheckout()}
							>
								{isPending
									? t('Создаём платёж…', 'Creating payment…')
									: t('Перейти к оплате', 'Continue to payment')}
								{!isPending ? <FiExternalLink aria-hidden='true' /> : null}
							</AiButton>
							<AiButton variant='ghost' onClick={closeCheckout}>
								{t('Отмена', 'Cancel')}
							</AiButton>
						</div>
						<small>
							{t(
								'После успешной оплаты баланс обновится автоматически. Нажимая «Перейти к оплате», вы принимаете ',
								'Your balance will update automatically after successful payment. By continuing, you accept the ',
							)}
							<Link
								className={styles.legalLink}
								href='/legal/public-offer'
								rel='noreferrer'
								target='_blank'
							>
								{t('Публичную оферту', 'Public Offer')}
							</Link>
							.
						</small>
					</div>
				</div>
			) : null}
		</AiPage>
	);
}

function ProviderChoice({
	provider,
	checked,
	autoFocus,
	onChange,
}: {
	provider: AiPaymentProvider;
	checked: boolean;
	autoFocus: boolean;
	onChange: () => void;
}) {
	return (
		<label
			className={`${styles.providerChoice} ${checked ? styles.providerChoiceActive : ''}`}
		>
			<input
				autoFocus={autoFocus}
				checked={checked}
				name='payment-provider'
				type='radio'
				onChange={onChange}
			/>
			<span>
				<strong>{provider.name}</strong>
				{provider.description ? <small>{provider.description}</small> : null}
			</span>
		</label>
	);
}

function isCreditCountName(value: string): boolean {
	return /^[\d\s.,]+(?:кредит(?:а|ов)?|credits?)$/iu.test(value.trim());
}

function formatActivePromo(promo: AiActivePromo, locale: string): string {
	if (promo.discountType === 'percent') return `−${promo.discountValue}%`;
	if (promo.discountType === 'fixed_amount') {
		return `−${formatMoney(promo.discountValue, promo.currency || 'RUB', locale)}`;
	}
	return `+${formatCredits(promo.bonusCredits || promo.discountValue, locale)}`;
}
