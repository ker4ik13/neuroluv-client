import { IconRenderer } from '@/shared/ui/icon-renderer';

type AppIconProps = {
	icon: { code: string; library: string; title?: string } | null;
	className?: string;
	hideArrows?: boolean;
};

export function AppIcon({ icon, className, hideArrows = false }: AppIconProps) {
	if (!icon || (hideArrows && /arrow|chevron.?right/i.test(icon.code))) {
		return null;
	}

	return (
		<IconRenderer
			className={className}
			code={icon.code}
			library={icon.library}
			title={icon.title}
		/>
	);
}
