'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { FiFileText, FiImage, FiVideo } from 'react-icons/fi';
import { useAiLocale } from '@/features/ai-locale';
import type { AiPlan, AiPromptCard } from '@/shared/api/ai';
import { PromptCardMedia } from '@/shared/ui/prompt-card-media';
import { getStudioPreview } from '../model/studio-preview';
import { AiLinkButton, AiPage } from './AiUi';
import styles from './StudioLandingPage.module.scss';
import { StudioPricingSection } from './StudioPricingSection';

const TASKS = [
	{
		label: ['Текст', 'Text'],
		primary: false,
		href: '/ai/create/text',
		icon: FiFileText,
	},
	{
		label: ['Фото', 'Images'],
		primary: true,
		href: '/ai/create/photo',
		icon: FiImage,
	},
	{
		label: ['Видео', 'Video'],
		primary: false,
		href: '/ai/create/video',
		icon: FiVideo,
	},
] as const;

const WORKFLOWS = [
	{
		title: ['Тексты, с которыми можно работать', 'Writing you can work with'],
		description: [
			'Обсудите идею, соберите структуру, отредактируйте материал. Ведите диалог и уточняйте ответ, не начиная каждый раз заново.',
			'Discuss an idea, build an outline and edit your draft. Keep the conversation going and refine the answer without starting over.',
		],
		models: 'ChatGPT · Claude · DeepSeek',
		href: '/ai/create/text',
		action: ['Открыть AI-чат', 'Open AI chat'],
	},
	{
		title: ['Изображения под вашу задачу', 'Images for your project'],
		description: [
			'Портреты, предметные съёмки, обложки и рекламные материалы. Опишите сцену или приложите референс, затем выберите формат и модель.',
			'Portraits, product photography, covers and advertising. Describe the scene or attach a reference, then choose the format and model.',
		],
		models: 'Nano Banana · GPT Image · Seedream',
		href: '/ai/create/photo',
		action: ['Перейти к изображениям', 'Explore image generation'],
	},
	{
		title: ['От первого кадра к истории', 'Turn a frame into a story'],
		description: [
			'Оживите фотографию или создайте ролик с нуля. Задайте движение камеры, длительность и формат кадра в настройках выбранной модели.',
			'Animate a photograph or make a video from scratch. Set camera movement, duration and aspect ratio using the options supported by your model.',
		],
		models: 'Seedance · Kling · Grok Imagine',
		href: '/ai/create/video',
		action: ['Перейти к видео', 'Explore video generation'],
	},
] as const;

const STEPS = [
	{
		title: ['Выберите задачу', 'Choose your task'],
		text: [
			'Текст, изображение или видео. Внутри — модели и настройки для нужного результата.',
			'Text, image or video. Find models and settings for the result you need.',
		],
	},
	{
		title: ['Добавьте свою идею', 'Add your idea'],
		text: [
			'Напишите описание, загрузите референс или начните с готового промпта.',
			'Write a description, upload a reference or start with a ready-made prompt.',
		],
	},
	{
		title: ['Сохраните результат', 'Keep the result'],
		text: [
			'Скачайте работу или вернитесь к ней позже. Чаты и результаты остаются в вашем аккаунте.',
			'Download your work or return to it later. Chats and results stay in your account.',
		],
	},
] as const;

type ExampleFilter = 'all' | 'image' | 'video';

export function StudioLandingPage({
	examples,
	plans,
	children,
	firstScreen,
}: {
	examples: AiPromptCard[];
	plans: AiPlan[];
	children?: ReactNode;
	firstScreen?: ReactNode;
}) {
	const { t } = useAiLocale();
	const [filter, setFilter] = useState<ExampleFilter>('all');
	const visibleExamples = examples.filter(
		(prompt) => filter === 'all' || prompt.modality === filter,
	);
	const heroExamples = examples.slice(0, 2);
	const filters: Array<{ value: ExampleFilter; label: string }> = [
		{ value: 'all', label: t('Все работы', 'All examples') },
		{ value: 'image', label: t('Изображения', 'Images') },
		...(examples.some((prompt) => prompt.modality === 'video')
			? [{ value: 'video' as const, label: t('Видео', 'Video') }]
			: []),
	];

	return (
		<AiPage className={styles.landing}>
			{firstScreen || <header
				className={`${styles.hero} ${heroExamples.length ? '' : styles.heroWithoutMedia}`}
			>
				<div className={styles.heroCopy}>
					<h1>{t('Создавайте с нейросетями', 'Create with AI')}</h1>
					<p className={styles.heroLead}>
						{t(
							'Пишите, создавайте изображения и видео. Нужные нейросети — в одной студии, с общим балансом и историей работ.',
							'Write, create images and make videos. The AI models you need, in one studio with a shared balance and work history.',
						)}
					</p>
					<nav
						className={styles.heroChoices}
						aria-label={t('Что создать в Studio', 'Create in Studio')}
					>
						{TASKS.map(({ label, primary, href, icon: Icon }) => (
							<AiLinkButton
								key={href}
								href={href}
								variant={primary ? 'primary' : 'ghost'}
							>
								<Icon aria-hidden='true' />
								{t(label[0], label[1])}
							</AiLinkButton>
						))}
					</nav>
					<a className={styles.textLink} href='#studio-examples'>
						{t('Посмотреть примеры', 'See examples')}
					</a>
					<p className={styles.heroNote}>
						{t(
							'Один аккаунт. Разные модели. Ваш выбор.',
							'One account. Different models. Your choice.',
						)}
					</p>
				</div>
				{heroExamples.length ? (
					<div
						className={styles.heroGallery}
						aria-label={t(
							'Примеры из каталога промптов',
							'Examples from the prompt catalog',
						)}
					>
						{heroExamples.map((prompt, index) => (
							<figure className={styles.heroExample} key={prompt.id}>
								<PromptCardMedia
									alt={prompt.title}
									className={styles.heroMedia}
									href={`/ai/prompts/${prompt.slug}`}
									image={
										prompt.imageUrl
											? { id: prompt.id, url: prompt.imageUrl }
											: null
									}
									priority={index === 0}
									sizes='(max-width: 768px) 55vw, 28vw'
								/>
								<figcaption>
									<span>
										{prompt.modelNames[0] || t('AI-изображение', 'AI image')}
									</span>
									<Link href={`/ai/prompts/${prompt.slug}`}>
										{t('Открыть промпт', 'View prompt')}
									</Link>
								</figcaption>
							</figure>
						))}
					</div>
				) : null}
			</header>}

			<section
				aria-labelledby='studio-examples-title'
				className={styles.section}
				id='studio-examples'
			>
				<div className={styles.sectionHeading}>
					<div>
						<h2 id='studio-examples-title'>
							{t(
								'Посмотрите, с чего можно начать.',
								'See where you could start.',
							)}
						</h2>
						<p>
							{t(
								'Работы из нашего каталога. У каждой — готовый промпт, который можно адаптировать под себя.',
								'Examples from our catalog, each with a ready-made prompt you can make your own.',
							)}
						</p>
					</div>
					<Link className={styles.textLink} href='/ai/prompts'>
						{t('Весь каталог', 'Browse all prompts')}
					</Link>
				</div>
				{examples.length ? (
					<>
						<div
							aria-label={t('Тип примеров', 'Example type')}
							className={styles.filters}
							role='group'
						>
							{filters.map(({ value, label }) => (
								<button
									aria-pressed={filter === value}
									className={
										filter === value ? styles.filterActive : styles.filter
									}
									key={value}
									onClick={() => setFilter(value)}
									type='button'
								>
									{label}
								</button>
							))}
						</div>
						<div className={styles.examplesGrid}>
							{visibleExamples.map((prompt) => (
								<StudioExample key={prompt.id} prompt={prompt} />
							))}
						</div>
					</>
				) : (
					<p className={styles.catalogUnavailable}>
						{t(
							'Примеры временно не загрузились. Можно открыть каталог промптов или сразу перейти к созданию работы.',
							'Examples could not be loaded. You can browse the prompt catalog or start creating right away.',
						)}
					</p>
				)}
			</section>

			<StudioPricingSection plans={plans} />

			{!children ? (
				<section
					aria-labelledby='studio-workflows-title'
					className={`${styles.section} ${styles.workflows}`}
				>
					<div className={styles.sectionHeading}>
						<div>
							<h2 id='studio-workflows-title'>
								{t('Инструменты для ваших задач', 'Tools for your projects')}
							</h2>
							<p>
								{t(
									'Не нужно собирать инструменты по разным сервисам. Выбирайте модель под задачу и продолжайте работу здесь.',
									'No need to assemble tools across different services. Choose a model for the task and keep working here.',
								)}
							</p>
						</div>
					</div>
					<div className={styles.workflowList}>
						{WORKFLOWS.map((item, index) => (
							<article className={styles.workflow} key={item.href}>
								<span className={styles.number}>0{index + 1}</span>
								<div>
									<h3>{t(item.title[0], item.title[1])}</h3>
									<p>{t(item.description[0], item.description[1])}</p>
									<span className={styles.modelNames}>{item.models}</span>
									<Link className={styles.textLink} href={item.href}>
										{t(item.action[0], item.action[1])}
									</Link>
								</div>
							</article>
						))}
					</div>
				</section>
			) : null}

			<section
				aria-labelledby='studio-photo-prompt-title'
				className={`${styles.section} ${styles.toolSection}`}
			>
				<div>
					<h2 id='studio-photo-prompt-title'>
						{t('Превратите фото в промпт', 'Turn a photo into a prompt')}
					</h2>
					<p>
						{t(
							'Загрузите изображение, чтобы получить описание сцены, света и композиции. Используйте его как отправную точку для новой генерации.',
							'Upload an image to get a description of its scene, lighting and composition. Use it as a starting point for a new generation.',
						)}
					</p>
					<Link className={styles.textLink} href='/ai/tools/photo-to-prompt'>
						{t('Получить промпт из фото', 'Get a prompt from a photo')}
					</Link>
				</div>
				<div className={styles.promptSample}>
					<span>
						{t(
							'Например, описание предметной съёмки',
							'For example, a product photography prompt',
						)}
					</span>
					<blockquote>
						{t(
							'Предметная съёмка флакона на светлом фоне. Мягкий боковой свет, естественные тени, акцент на фактуре стекла. Лаконичная композиция, свободное пространство для заголовка.',
							'Product photograph of a bottle on a light background. Soft side lighting, natural shadows and a focus on the texture of glass. A minimal composition with room for a headline.',
						)}
					</blockquote>
					<span className={styles.sampleNote}>
						{t(
							'Уточните детали — и создайте свой вариант.',
							'Refine the details and make your own version.',
						)}
					</span>
				</div>
			</section>

			{children || (
				<>
					<section
						aria-labelledby='studio-steps-title'
						className={styles.section}
					>
						<div className={styles.sectionHeading}>
							<div>
								<h2 id='studio-steps-title'>
									{t('Начните с простой идеи.', 'Start with a simple idea.')}
								</h2>
							</div>
						</div>
						<ol className={styles.steps}>
							{STEPS.map((step, index) => (
								<li key={step.title[0]}>
									<span className={styles.number}>0{index + 1}</span>
									<h3>{t(step.title[0], step.title[1])}</h3>
									<p>{t(step.text[0], step.text[1])}</p>
								</li>
							))}
						</ol>
					</section>

					<section
						aria-labelledby='studio-about-title'
						className={`${styles.section} ${styles.about}`}
					>
						<div>
							<h2 id='studio-about-title'>
								{t(
									'Всё для вашей следующей работы.',
									'Everything for your next project.',
								)}
							</h2>
						</div>
						<div className={styles.aboutCopy}>
							<p>
								{t(
									'Нейролюб Studio — AI-агрегатор для работы с текстом, фото и видео. Здесь можно общаться с ChatGPT, Claude и DeepSeek, создавать изображения в Nano Banana и GPT Image, генерировать видео в Seedance и других моделях.',
									'Neuroluv Studio is an AI aggregator for text, images and video. Chat with ChatGPT, Claude and DeepSeek, create images with Nano Banana and GPT Image, and generate video with Seedance and other models.',
								)}
							</p>
							<p>
								{t(
									'Для каждой задачи доступны свои настройки: формат, разрешение, длительность, референсы. Готовые промпты помогают начать, а история чатов и библиотека работ — вернуться к результату и продолжить.',
									'Each task has its own settings: format, resolution, duration and references. Ready-made prompts help you get started, while chat history and your work library let you return to a result and continue.',
								)}
							</p>
							<p>
								{t(
									'Стоимость зависит от модели и параметров. Перед запуском Studio показывает оценку в кредитах. Актуальные тарифы и пакеты пополнения — на странице баланса.',
									'The cost depends on the model and settings. Studio shows an estimate in credits before you start. Current plans and top-up packages are on the balance page.',
								)}
							</p>
							<Link className={styles.textLink} href='/ai/balance'>
								{t('Тарифы и баланс', 'Plans and balance')}
							</Link>
						</div>
					</section>
				</>
			)}

			<section
				aria-labelledby='studio-start-title'
				className={styles.startSection}
			>
				<div>
					<h2 id='studio-start-title'>
						{t('Что создадим сегодня?', 'What will you create today?')}
					</h2>
					<p>
						{t(
							'Начните с изображения, текста или своей первой сцены.',
							'Start with an image, a piece of writing or your first scene.',
						)}
					</p>
				</div>
				<Link className={styles.primaryButton} href='/ai/create/photo'>
					{t('Открыть студию', 'Open the studio')}
				</Link>
			</section>
		</AiPage>
	);
}

function StudioExample({ prompt }: { prompt: AiPromptCard }) {
	const { t } = useAiLocale();
	const href = `/ai/prompts/${prompt.slug}`;
	const preview = getStudioPreview(prompt);
	return (
		<article className={styles.example}>
			<PromptCardMedia
				alt={prompt.title}
				className={styles.exampleMedia}
				href={href}
				image={preview ? { id: prompt.id, url: preview.url } : null}
				style={{ aspectRatio: preview?.aspectRatio }}
				images={prompt.modality === 'video' ? prompt.media : undefined}
				poster={prompt.imageUrl || undefined}
				sizes='(max-width: 480px) 90vw, (max-width: 768px) 45vw, 30vw'
			/>
			<div className={styles.exampleMeta}>
				<span>
					{prompt.modality === 'video'
						? t('Видео', 'Video')
						: t('Изображение', 'Image')}
				</span>
				<span>{prompt.modelNames[0]}</span>
			</div>
			<h3>
				<Link href={href}>{prompt.title}</Link>
			</h3>
		</article>
	);
}
