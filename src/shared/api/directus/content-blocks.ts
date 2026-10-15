import type {
	NewsContentBlock,
	NewsContentButton,
	NewsContentCard,
	NewsContentListItem,
	NewsContentStep,
	NewsImage,
} from '@/entities/news';
import {
	type DirectusContentButtonIcon,
	normalizeDirectusContentButtonIcon,
} from '@/shared/api/directus/content-button-icon';
import { buildDirectusAssetUrl } from '@/shared/config/directus';
import { getImageAlt } from '@/shared/lib/media/image-alt';
import {
	buildDirectusFaqFields,
	type DirectusContentFaq,
	normalizeDirectusContentFaq,
} from './faq';

type DirectusFile = {
	id: string;
	title: string | null;
	type: string | null;
	width: number | null;
	height: number | null;
};

type DirectusContentListItem = {
	id: number;
	sort: number | null;
	title: string | null;
	description: string | null;
};

type DirectusContentCard = {
	id: number;
	sort: number | null;
	title: string | null;
	description: string | null;
	link: string | null;
	image: DirectusFile | string | null;
};

type DirectusContentStep = {
	id: number;
	sort: number | null;
	is_active: boolean | null;
	title: string | null;
	description: string | null;
	is_warning?: boolean | null;
	buttons?: DirectusContentButtonJunction[];
};

type DirectusContentButton = {
	id: number;
	label: string | null;
	url: string | null;
	target: '_self' | '_blank' | null;
	variant: 'primary' | 'secondary' | 'outline' | null;
	icon?: DirectusContentButtonIcon | null;
	is_active: boolean | null;
};

type DirectusContentButtonJunction = {
	sort: number | null;
	hero_buttons_id: DirectusContentButton | number | null;
};

type DirectusContentHtml = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	content: string | null;
};

type DirectusContentText = DirectusContentHtml;

type DirectusContentQuote = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	text: string | null;
	author: string | null;
};

type DirectusContentList = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	items?: DirectusContentListItem[];
};

type DirectusContentImage = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	caption: string | null;
	image: DirectusFile | string | null;
};

type DirectusContentVideo = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	caption: string | null;
	video: DirectusFile | string | null;
	video_url: string | null;
};

type DirectusContentCta = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	description: string | null;
	buttons?: DirectusContentButtonJunction[];
};

type DirectusContentCards = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	cards?: DirectusContentCard[];
};

type DirectusContentSteps = {
	id: number;
	is_active: boolean | null;
	title: string | null;
	steps?: DirectusContentStep[];
};

export type DirectusContentBlock = {
	id: number;
	sort: number | null;
	collection: string | null;
	item:
		| DirectusContentHtml
		| DirectusContentText
		| DirectusContentQuote
		| DirectusContentList
		| DirectusContentImage
		| DirectusContentVideo
		| DirectusContentCta
		| DirectusContentCards
		| DirectusContentSteps
		| DirectusContentFaq
		| number
		| string
		| null;
};

export function buildDirectusContentBlockFields(prefix: string): string[] {
	return [
		`${prefix}.id`,
		`${prefix}.sort`,
		`${prefix}.collection`,
		...buildDirectusFaqFields(prefix),
		`${prefix}.item:content_html.id`,
		`${prefix}.item:content_html.is_active`,
		`${prefix}.item:content_html.title`,
		`${prefix}.item:content_html.content`,
		`${prefix}.item:content_text.id`,
		`${prefix}.item:content_text.is_active`,
		`${prefix}.item:content_text.title`,
		`${prefix}.item:content_text.content`,
		`${prefix}.item:content_quote.id`,
		`${prefix}.item:content_quote.is_active`,
		`${prefix}.item:content_quote.title`,
		`${prefix}.item:content_quote.text`,
		`${prefix}.item:content_quote.author`,
		`${prefix}.item:content_list.id`,
		`${prefix}.item:content_list.is_active`,
		`${prefix}.item:content_list.title`,
		`${prefix}.item:content_list.items.id`,
		`${prefix}.item:content_list.items.sort`,
		`${prefix}.item:content_list.items.title`,
		`${prefix}.item:content_list.items.description`,
		`${prefix}.item:content_image.id`,
		`${prefix}.item:content_image.is_active`,
		`${prefix}.item:content_image.title`,
		`${prefix}.item:content_image.caption`,
		`${prefix}.item:content_image.image.id`,
		`${prefix}.item:content_image.image.title`,
		`${prefix}.item:content_image.image.type`,
		`${prefix}.item:content_image.image.width`,
		`${prefix}.item:content_image.image.height`,
		`${prefix}.item:content_video.id`,
		`${prefix}.item:content_video.is_active`,
		`${prefix}.item:content_video.title`,
		`${prefix}.item:content_video.caption`,
		`${prefix}.item:content_video.video.id`,
		`${prefix}.item:content_video.video.title`,
		`${prefix}.item:content_video.video.type`,
		`${prefix}.item:content_video.video.width`,
		`${prefix}.item:content_video.video.height`,
		`${prefix}.item:content_video.video_url`,
		`${prefix}.item:content_cta.id`,
		`${prefix}.item:content_cta.is_active`,
		`${prefix}.item:content_cta.title`,
		`${prefix}.item:content_cta.description`,
		`${prefix}.item:content_cta.buttons.sort`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.id`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.label`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.url`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.target`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.variant`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.icon.title`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.icon.code`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.icon.library`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.icon.is_active`,
		`${prefix}.item:content_cta.buttons.hero_buttons_id.is_active`,
		`${prefix}.item:content_cards.id`,
		`${prefix}.item:content_cards.is_active`,
		`${prefix}.item:content_cards.title`,
		`${prefix}.item:content_cards.cards.id`,
		`${prefix}.item:content_cards.cards.sort`,
		`${prefix}.item:content_cards.cards.title`,
		`${prefix}.item:content_cards.cards.description`,
		`${prefix}.item:content_cards.cards.link`,
		`${prefix}.item:content_cards.cards.image.id`,
		`${prefix}.item:content_cards.cards.image.title`,
		`${prefix}.item:content_cards.cards.image.type`,
		`${prefix}.item:content_cards.cards.image.width`,
		`${prefix}.item:content_cards.cards.image.height`,
		`${prefix}.item:content_steps.id`,
		`${prefix}.item:content_steps.is_active`,
		`${prefix}.item:content_steps.title`,
		`${prefix}.item:content_steps.steps.id`,
		`${prefix}.item:content_steps.steps.sort`,
		`${prefix}.item:content_steps.steps.is_active`,
		`${prefix}.item:content_steps.steps.title`,
		`${prefix}.item:content_steps.steps.description`,
		`${prefix}.item:content_steps.steps.is_warning`,
		`${prefix}.item:content_steps.steps.buttons.sort`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.id`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.label`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.url`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.target`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.variant`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.icon.title`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.icon.code`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.icon.library`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.icon.is_active`,
		`${prefix}.item:content_steps.steps.buttons.hero_buttons_id.is_active`,
	];
}

export function normalizeDirectusContentBlocks(
	blocks: DirectusContentBlock[],
): NewsContentBlock[] {
	return blocks
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.map(normalizeContentBlock)
		.filter((block): block is NewsContentBlock => block !== null);
}

function normalizeContentBlock(
	block: DirectusContentBlock,
): NewsContentBlock | null {
	if (block.collection === 'block_faq') {
		return normalizeDirectusContentFaq(block.id, block.item);
	}

	if (block.collection === 'content_html') {
		return normalizeHtmlBlock(block.id, block.item);
	}

	if (block.collection === 'content_text') {
		return normalizeTextBlock(block.id, block.item);
	}

	if (block.collection === 'content_quote') {
		return normalizeQuoteBlock(block.id, block.item);
	}

	if (block.collection === 'content_list') {
		return normalizeListBlock(block.id, block.item);
	}

	if (block.collection === 'content_image') {
		return normalizeImageBlock(block.id, block.item);
	}

	if (block.collection === 'content_video') {
		return normalizeVideoBlock(block.id, block.item);
	}

	if (block.collection === 'content_cta') {
		return normalizeCtaBlock(block.id, block.item);
	}

	if (block.collection === 'content_cards') {
		return normalizeCardsBlock(block.id, block.item);
	}

	if (block.collection === 'content_steps') {
		return normalizeStepsContentBlock(block.id, block.item);
	}

	return null;
}

function normalizeHtmlBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const html = item as DirectusContentHtml;

	if (!html.content) {
		return null;
	}

	return {
		id,
		type: 'html',
		title: html.title,
		content: html.content,
	};
}

function normalizeTextBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const text = item as DirectusContentText;

	if (!text.content) {
		return null;
	}

	return {
		id,
		type: 'text',
		title: text.title,
		content: text.content,
	};
}

function normalizeQuoteBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const quote = item as DirectusContentQuote;

	if (!quote.text) {
		return null;
	}

	return {
		id,
		type: 'quote',
		title: quote.title,
		text: quote.text,
		author: quote.author,
	};
}

function normalizeListBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const list = item as DirectusContentList;
	const items = (list.items || [])
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.map(normalizeContentListItem)
		.filter((listItem): listItem is NewsContentListItem => listItem !== null);

	if (items.length === 0) {
		return null;
	}

	return {
		id,
		type: 'list',
		title: list.title,
		items,
	};
}

function normalizeImageBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const imageBlock = item as DirectusContentImage;
	const image = normalizeImage(
		imageBlock.image,
		imageBlock.title || imageBlock.caption || 'Иллюстрация к материалу',
	);

	if (!image) {
		return null;
	}

	return {
		id,
		type: 'image',
		title: imageBlock.title,
		caption: imageBlock.caption,
		image,
	};
}

function normalizeVideoBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const videoBlock = item as DirectusContentVideo;
	const video = normalizeImage(videoBlock.video, videoBlock.title || 'Видео');

	if (!video && !videoBlock.video_url) {
		return null;
	}

	return {
		id,
		type: 'video',
		title: videoBlock.title,
		caption: videoBlock.caption,
		video,
		videoUrl: videoBlock.video_url,
	};
}

function normalizeCtaBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const cta = item as DirectusContentCta;

	if (!cta.title || !cta.description) {
		return null;
	}

	return {
		id,
		type: 'cta',
		title: cta.title,
		description: cta.description,
		buttons: normalizeContentButtons(cta.buttons || []),
	};
}

function normalizeCardsBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const cardsBlock = item as DirectusContentCards;
	const cards = (cardsBlock.cards || [])
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.map(normalizeContentCard)
		.filter((card): card is NewsContentCard => card !== null);

	if (cards.length === 0) {
		return null;
	}

	return {
		id,
		type: 'cards',
		title: cardsBlock.title,
		cards,
	};
}

function normalizeStepsContentBlock(
	id: number,
	item: DirectusContentBlock['item'],
): NewsContentBlock | null {
	if (!item || typeof item !== 'object' || item.is_active === false) {
		return null;
	}

	const stepsBlock = item as DirectusContentSteps;
	const steps = (stepsBlock.steps || [])
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.map(normalizeContentStep)
		.filter((step): step is NewsContentStep => step !== null);

	if (steps.length === 0) {
		return null;
	}

	return {
		id,
		type: 'steps',
		title: stepsBlock.title,
		steps,
	};
}

function normalizeContentListItem(
	item: DirectusContentListItem,
): NewsContentListItem | null {
	if (!item.title && !item.description) {
		return null;
	}

	return {
		id: item.id,
		title: item.title || '',
		description: item.description || '',
	};
}

function normalizeContentCard(
	item: DirectusContentCard,
): NewsContentCard | null {
	if (!item.title && !item.description) {
		return null;
	}

	return {
		id: item.id,
		title: item.title || '',
		description: item.description || '',
		href: item.link,
		image: normalizeImage(item.image, item.title || 'Карточка'),
	};
}

function normalizeContentStep(
	item: DirectusContentStep,
): NewsContentStep | null {
	if (item.is_active === false || (!item.title && !item.description)) {
		return null;
	}

	return {
		id: item.id,
		title: item.title || '',
		description: item.description || '',
		isWarning: item.is_warning === true,
		buttons: normalizeContentButtons(item.buttons || []),
	};
}

function normalizeContentButtons(
	buttons: DirectusContentButtonJunction[],
): NewsContentButton[] {
	return buttons
		.sort((first, second) => (first.sort || 0) - (second.sort || 0))
		.map((junction) => junction.hero_buttons_id)
		.filter(
			(button): button is DirectusContentButton =>
				Boolean(button) && typeof button === 'object',
		)
		.filter(
			(button) =>
				button.is_active !== false && Boolean(button.label && button.url),
		)
		.map((button) => ({
			id: button.id,
			label: button.label || '',
			href: button.url || '#',
			target: button.target || '_self',
			variant: button.variant || 'primary',
			icon: normalizeDirectusContentButtonIcon(button.icon),
		}));
}

function normalizeImage(
	image: DirectusFile | string | null,
	fallbackTitle: string,
): NewsImage | null {
	if (!image) {
		return null;
	}

	const file =
		typeof image === 'string'
			? {
					id: image,
					title: fallbackTitle,
					type: null,
					width: null,
					height: null,
				}
			: image;

	return {
		id: file.id,
		title: getImageAlt(file.title, fallbackTitle),
		url: buildDirectusAssetUrl(file.id, { type: file.type }),
		type: file.type,
		width: file.width,
		height: file.height,
	};
}
