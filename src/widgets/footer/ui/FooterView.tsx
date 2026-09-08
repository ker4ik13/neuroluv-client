import Link from 'next/link';
import type { FooterData, FooterLink } from '@/entities/footer';
import type { NavigationLogo, SocialLink } from '@/entities/navigation';
import { BrandIcon } from '@/shared/ui/brand-icon';
import { Container } from '@/shared/ui/container';
import styles from './Footer.module.scss';

type FooterViewProps = {
	footer: FooterData;
};

const FOUNDER_CREDIT = {
	label: 'Основатель:',
	name: 'Видяшкина Ирина',
	url: 'https://t.me/imishka0',
} as const;

export function FooterView({ footer }: FooterViewProps) {
	return (
		<footer className={styles.footer}>
			<Container className={styles.inner}>
				<div className={styles.top}>
					<div className={styles.brand}>
						<Link aria-label='На главную' className={styles.logo} href='/'>
							<LogoMark logo={footer.logo} />
							<span className={styles.logoText}>{footer.siteName}</span>
						</Link>

						{footer.description && (
							<p className={styles.description}>{footer.description}</p>
						)}

						{footer.socialLinks.length > 0 && (
							<div className={styles.socialBlock}>
								<p className={styles.socialTitle}>Мы в соцсетях</p>
								<div className={styles.socials}>
									{footer.socialLinks.map((link) => (
										<SocialLinkItem key={link.id} link={link} />
									))}
								</div>
							</div>
						)}
					</div>

					<nav aria-label='Навигация в футере' className={styles.columns}>
						{footer.columns.map((column) => (
							<div className={styles.column} key={column.id}>
								<h2 className={styles.columnTitle}>{column.title}</h2>
								<ul className={styles.linkList}>
									{column.links.map((link) => (
										<li key={link.id}>
											<FooterLinkItem className={styles.link} link={link} />
										</li>
									))}
								</ul>
							</div>
						))}
					</nav>
				</div>

				{footer.legalLinks.length > 0 && (
					<nav aria-label='Юридические документы' className={styles.legalLinks}>
						{footer.legalLinks.map((link) => (
							<FooterLinkItem
								className={styles.legalLink}
								key={link.id}
								link={link}
							/>
						))}
					</nav>
				)}

				<div className={styles.divider} />

				<div className={styles.bottom}>
					<p className={styles.copyright}>{footer.copyrightText}</p>

					<div className={styles.credits}>
						<CreditBadge {...FOUNDER_CREDIT} />
						{footer.developerLabel && (
							<CreditBadge
								label='Разработка и продвижение:'
								name={footer.developerLabel}
								url={footer.developerUrl}
							/>
						)}
					</div>

					{footer.contactLink && (
						<FooterLinkItem
							className={styles.contactLink}
							link={footer.contactLink}
						/>
					)}
				</div>
			</Container>
		</footer>
	);
}

function LogoMark({ logo }: { logo: NavigationLogo | null }) {
	if (!logo) {
		return null;
	}

	return (
		<span className={styles.logoImageBox}>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				alt=''
				aria-hidden='true'
				className={styles.logoImage}
				src={logo.url}
				title={logo.title}
			/>
		</span>
	);
}

function SocialLinkItem({ link }: { link: SocialLink }) {
	return (
		<a
			aria-label={link.title}
			className={styles.socialLink}
			href={link.url}
			rel='noreferrer'
			target='_blank'
			title={link.title}
		>
			<BrandIcon className={styles.socialIcon} platform={link.platform} />
		</a>
	);
}

function CreditBadge({
	label,
	name,
	url,
}: {
	label: string;
	name: string;
	url: string | null;
}) {
	const content = (
		<>
			<span className={styles.creditLabel}>{label}</span>
			<span className={styles.creditName}>{name}</span>
		</>
	);

	if (!url) {
		return <span className={styles.credit}>{content}</span>;
	}

	return (
		<a className={styles.credit} href={url} rel='noreferrer' target='_blank'>
			{content}
		</a>
	);
}

function FooterLinkItem({
	className,
	link,
}: {
	className: string;
	link: FooterLink;
}) {
	if (link.target === '_blank' || link.href.startsWith('http')) {
		return (
			<a
				className={className}
				href={link.href}
				rel={link.target === '_blank' ? 'noreferrer' : undefined}
				target={link.target}
			>
				{link.label}
			</a>
		);
	}

	return (
		<Link className={className} href={link.href}>
			{link.label}
		</Link>
	);
}
