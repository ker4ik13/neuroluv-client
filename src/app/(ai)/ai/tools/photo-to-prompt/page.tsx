import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { AiPageContentBlock } from '@/shared/api/ai/contracts';
import { getAiPageMetadata } from '@/shared/api/ai/public';
import { buildAiPageMetadata } from '@/shared/lib/seo/ai-metadata';
import { buildBreadcrumbJsonLd } from '@/shared/lib/seo/json-ld';
import { JsonLd } from '@/shared/ui/json-ld';
import { CreateStudioPage } from '@/widgets/ai-pages';
import styles from './page.module.scss';

const PAGE_PATH = '/ai/tools/photo-to-prompt';

export function generateMetadata(): Promise<Metadata> {
	return buildAiPageMetadata(
		PAGE_PATH,
		{
			title: 'Промпт по фото онлайн — создать готовый промт для нейросети',
			description:
				'Создайте промпт по фото онлайн: загрузите референс и получите готовый подробный промт для нейросети, портрета, аватарки или фотосессии.',
		},
		{ indexable: true },
	);
}

export default async function Page() {
	const [page, nonceHeaders] = await Promise.all([
		getAiPageMetadata(PAGE_PATH),
		headers(),
	]);
	const blocks = page?.blocks || [];
	const faq = blocks.find(
		(block): block is Extract<AiPageContentBlock, { type: 'faq' }> =>
			block.type === 'faq',
	);

	return (
		<>
			<JsonLd
				data={[
					buildBreadcrumbJsonLd([
						{ name: 'Главная', url: '/' },
						{ name: 'Нейролюб Studio', url: '/ai' },
						{
							name: page?.heading || 'Промпт из фото',
							url: PAGE_PATH,
						},
					]),
					...(faq
						? [
								{
									'@context': 'https://schema.org',
									'@type': 'FAQPage',
									mainEntity: faq.items.map((item) => ({
										'@type': 'Question',
										name: item.question,
										acceptedAnswer: {
											'@type': 'Answer',
											text: item.answer,
										},
									})),
								},
							]
						: []),
				]}
				nonce={nonceHeaders.get('x-nonce') || undefined}
			/>
			<section className={styles.workspace}>
				<CreateStudioPage
					kind='photo-to-prompt'
					pageTitle={
						page?.heading ||
						'Промпт по фото — создать готовый промт для нейросети онлайн'
					}
				/>
			</section>
			{blocks.length ? <ManagedContent blocks={blocks} /> : null}
		</>
	);
}

function ManagedContent({ blocks }: { blocks: AiPageContentBlock[] }) {
	return (
		<main className={styles.content}>
			{blocks.map((block, index) => {
				if (block.type === 'text') {
					return (
						<section className={styles.section} key={`text-${index}`}>
							{block.title ? <h2>{block.title}</h2> : null}
							{block.paragraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</section>
					);
				}
				if (block.type === 'steps') {
					return (
						<section className={styles.section} key={`steps-${index}`}>
							{block.title ? <h2>{block.title}</h2> : null}
							<ol className={styles.cards}>
								{block.items.map((item) => (
									<li key={item.title}>
										<h3>{item.title}</h3>
										<p>{item.description}</p>
									</li>
								))}
							</ol>
						</section>
					);
				}
				if (block.type === 'list') {
					return (
						<section className={styles.section} key={`list-${index}`}>
							{block.title ? <h2>{block.title}</h2> : null}
							{block.intro ? <p>{block.intro}</p> : null}
							<ul className={styles.list}>
								{block.items.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
							{block.outro ? <p>{block.outro}</p> : null}
						</section>
					);
				}
				return (
					<section className={styles.section} key={`faq-${index}`}>
						<h2>{block.title || 'Частые вопросы'}</h2>
						<div className={styles.faq}>
							{block.items.map((item) => (
								<article key={item.question}>
									<h3>{item.question}</h3>
									<p>{item.answer}</p>
								</article>
							))}
						</div>
					</section>
				);
			})}
		</main>
	);
}
