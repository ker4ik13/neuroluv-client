type SocialBrand = {
	name: string;
	icon: string;
	color: string;
	darkColor?: string;
};

export const SOCIAL_BRANDS = {
	telegram: { name: 'Telegram', icon: 'FaTelegram', color: '#26a5e4' },
	vk: { name: 'ВКонтакте', icon: 'FaVk', color: '#0077ff' },
	pinterest: { name: 'Pinterest', icon: 'FaPinterest', color: '#e60023' },
	instagram: { name: 'Instagram', icon: 'FaInstagram', color: '#e4405f' },
	whatsapp: { name: 'WhatsApp', icon: 'FaWhatsapp', color: '#25d366' },
	youtube: { name: 'YouTube', icon: 'FaYoutube', color: '#ff0000' },
	facebook: { name: 'Facebook', icon: 'FaFacebook', color: '#0866ff' },
	twitter: { name: 'Twitter', icon: 'FaTwitter', color: '#1da1f2' },
	x: { name: 'X', icon: 'FaXTwitter', color: '#000000', darkColor: '#ffffff' },
	tiktok: { name: 'TikTok', icon: 'FaTiktok', color: '#fe2c55' },
	linkedin: { name: 'LinkedIn', icon: 'FaLinkedin', color: '#0a66c2' },
	odnoklassniki: {
		name: 'Одноклассники',
		icon: 'FaOdnoklassniki',
		color: '#ee8208',
	},
	discord: { name: 'Discord', icon: 'FaDiscord', color: '#5865f2' },
	github: {
		name: 'GitHub',
		icon: 'FaGithub',
		color: '#181717',
		darkColor: '#ffffff',
	},
	behance: { name: 'Behance', icon: 'FaBehance', color: '#1769ff' },
	dribbble: { name: 'Dribbble', icon: 'FaDribbble', color: '#ea4c89' },
	vimeo: { name: 'Vimeo', icon: 'FaVimeoV', color: '#1ab7ea' },
	twitch: { name: 'Twitch', icon: 'FaTwitch', color: '#9146ff' },
	reddit: { name: 'Reddit', icon: 'FaReddit', color: '#ff4500' },
	threads: {
		name: 'Threads',
		icon: 'FaThreads',
		color: '#000000',
		darkColor: '#ffffff',
	},
	mastodon: { name: 'Mastodon', icon: 'FaMastodon', color: '#6364ff' },
} as const satisfies Record<string, SocialBrand>;

export type SocialPlatform = keyof typeof SOCIAL_BRANDS;

const aliases: Record<string, SocialPlatform> = {
	tg: 'telegram',
	telegramplane: 'telegram',
	fatelegramplane: 'telegram',
	vkontakte: 'vk',
	vkcom: 'vk',
	insta: 'instagram',
	instagramofficial: 'instagram',
	pin: 'pinterest',
	yt: 'youtube',
	fb: 'facebook',
	whatsup: 'whatsapp',
	wa: 'whatsapp',
	xtwitter: 'x',
	twitterx: 'x',
	linkedinin: 'linkedin',
	falinkedinin: 'linkedin',
	ok: 'odnoklassniki',
	okru: 'odnoklassniki',
};

const platforms = Object.keys(SOCIAL_BRANDS) as SocialPlatform[];

export function getSocialBrand(
	value: string,
): (SocialBrand & { platform: SocialPlatform }) | null {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[\s_-]/g, '');
	const platform =
		(Object.hasOwn(aliases, normalized) ? aliases[normalized] : undefined) ||
		platforms.find(
			(key) =>
				key === normalized ||
				SOCIAL_BRANDS[key].icon.toLowerCase() === normalized,
		);
	return platform ? { platform, ...SOCIAL_BRANDS[platform] } : null;
}
