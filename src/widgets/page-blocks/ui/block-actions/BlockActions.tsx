import Link from 'next/link';
import type { PageHeroButton } from '@/entities/page';
import { AppIcon } from '@/shared/ui/app-icon';
import { buttonClassName } from '@/shared/ui/button';
import styles from './BlockActions.module.scss';

export function BlockActions({
	buttons,
	className,
}: {
	buttons: PageHeroButton[];
	className?: string;
}) {
	if (!buttons.length) return null;
	return (
		<div className={[styles.actions, className].filter(Boolean).join(' ')}>
			{buttons.map((button, index) => (
				<Link
					key={`${button.id}-${index}`}
					className={buttonClassName(
						button.variant === 'outline' ? 'ghost' : button.variant,
					)}
					href={button.href}
					target={button.target}
					rel={button.target === '_blank' ? 'noreferrer' : undefined}
				>
					<span>{button.label}</span>
					<AppIcon hideArrows icon={button.icon} />
				</Link>
			))}
		</div>
	);
}
