import { getSocialBrand } from '@/shared/lib/social/brands';
import { IconRenderer } from '@/shared/ui/icon-renderer';

type BrandIconProps = {
	platform: string;
	className?: string;
};

export function BrandIcon({ platform, className }: BrandIconProps) {
	const brand = getSocialBrand(platform);

	return (
		<IconRenderer
			className={className}
			code={brand?.icon || 'FiGlobe'}
			library='fa'
		/>
	);
}
