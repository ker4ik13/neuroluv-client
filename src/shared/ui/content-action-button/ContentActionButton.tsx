import type { NavigationIcon } from '@/entities/navigation';
import { AppIcon } from '@/shared/ui/app-icon';

export type ContentActionButtonData = {
	id: number;
	label: string;
	href: string;
	target: '_self' | '_blank';
	variant: 'primary' | 'secondary' | 'outline';
	icon: NavigationIcon | null;
};

export function ContentActionButton({
	button,
	className,
}: {
	button: ContentActionButtonData;
	className?: string;
}) {
	return (
		<a
			className={className}
			data-variant={button.variant}
			href={button.href}
			rel={button.target === '_blank' ? 'noreferrer' : undefined}
			target={button.target}
		>
			{button.label}
			<AppIcon icon={button.icon} />
		</a>
	);
}
