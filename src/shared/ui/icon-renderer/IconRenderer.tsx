import { createElement } from 'react';
import type { IconType } from 'react-icons';
import {
	FaBehance,
	FaDiscord,
	FaDribbble,
	FaFacebook,
	FaGithub,
	FaInstagram,
	FaLinkedin,
	FaMastodon,
	FaOdnoklassniki,
	FaPinterest,
	FaReddit,
	FaTelegram,
	FaTiktok,
	FaTwitch,
	FaTwitter,
	FaVimeoV,
	FaVk,
	FaWhatsapp,
	FaYoutube,
} from 'react-icons/fa';
import { FaThreads, FaXTwitter } from 'react-icons/fa6';
import * as FiIcons from 'react-icons/fi';
import { getSocialBrand } from '@/shared/lib/social/brands';
import { resolveInterfaceIconName } from './semantic-icons';

type IconRendererProps = {
	className?: string;
	code: string;
	library: string;
	title?: string;
};
const brands: Record<string, IconType> = {
	FaTelegram: FaTelegram,
	FaVk: FaVk,
	FaPinterest: FaPinterest,
	FaInstagram: FaInstagram,
	FaYoutube: FaYoutube,
	FaGithub: FaGithub,
	FaWhatsapp,
	FaFacebook,
	FaTwitter,
	FaXTwitter,
	FaTiktok,
	FaLinkedin,
	FaOdnoklassniki,
	FaDiscord,
	FaBehance,
	FaDribbble,
	FaVimeoV,
	FaTwitch,
	FaReddit,
	FaThreads,
	FaMastodon,
};
export function IconRenderer({ className, code, title }: IconRendererProps) {
	if (!code.trim()) return null;
	const icons = FiIcons as Record<string, IconType>;
	const Icon =
		brands[getSocialBrand(code)?.icon || ''] ||
		icons[resolveInterfaceIconName(code)] ||
		FiIcons.FiGrid;
	return createElement(Icon, {
		className,
		'aria-hidden': title ? undefined : true,
		'aria-label': title,
	});
}
