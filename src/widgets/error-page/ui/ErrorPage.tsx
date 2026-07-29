import Image from 'next/image';
import Link from 'next/link';
import styles from './ErrorPage.module.scss';

export type ErrorPageVariant = '404' | '500';
export type ErrorPageEnvironment = 'ai' | 'user';

type ErrorPageProps = {
	environment?: ErrorPageEnvironment;
	variant: ErrorPageVariant;
};

const ERROR_CONTENT: Record<
	ErrorPageVariant,
	{
		code: string;
		title: string;
		description: string;
		quote: string;
	}
> = {
	'404': {
		code: '404',
		title: 'Страница убежала с сайта',
		description:
			'Кажется, такой страницы не существует. Возможно, ссылка устарела, промпт потерялся или робот слишком увлекся генерацией.',
		quote: '«Я искал страницу, но не нашел...»',
	},
	'500': {
		code: '500',
		title: 'Сервер немного шалит',
		description:
			'Мы уже разбираемся, что пошло не так. Обычно такие сбои быстро чинятся, а пока можно вернуться на главную.',
		quote:
			'«Я нажал не ту кнопку, но уже делаю вид, что это была проверка устойчивости...»',
	},
};

const ERROR_ACTIONS: Record<
	ErrorPageEnvironment,
	{
		homeHref: string;
		secondaryHref: string;
		secondaryLabel: string;
	}
> = {
	ai: {
		homeHref: '/ai',
		secondaryHref: '/ai/prompts',
		secondaryLabel: 'К AI-промптам',
	},
	user: {
		homeHref: '/',
		secondaryHref: '/prompts',
		secondaryLabel: 'В галерею',
	},
};

export function ErrorPage({ environment = 'user', variant }: ErrorPageProps) {
	const content = ERROR_CONTENT[variant];
	const actions = ERROR_ACTIONS[environment];

	return (
		<section className={styles.page} aria-labelledby='error-page-title'>
			<div className={styles.hero}>
				<div className={styles.content}>
					<p className={styles.code}>{content.code}</p>
					<h1 className={styles.title} id='error-page-title'>
						{content.title}
					</h1>
					<p className={styles.description}>{content.description}</p>

					<div className={styles.actions}>
						<Link className={styles.primaryButton} href={actions.homeHref}>
							На главную
							<span aria-hidden='true'>→</span>
						</Link>
						<Link
							className={styles.secondaryButton}
							href={actions.secondaryHref}
						>
							{actions.secondaryLabel}
							<span aria-hidden='true'>→</span>
						</Link>
					</div>
				</div>

				<div className={styles.visual} aria-hidden='true'>
					<div className={styles.robotWrap}>
						<Image
							alt=''
							className={styles.robot}
							fill
							priority
							sizes='(max-width: 768px) 72vw, 420px'
							src='/images/error-robot.png'
						/>
					</div>

					<div className={styles.quote}>
						<span>Робот говорит:</span>
						<p>{content.quote}</p>
					</div>
				</div>
			</div>
		</section>
	);
}
