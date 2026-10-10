import type { ButtonVariant } from '@/shared/ui/button';

export type ContentActionVariant = 'primary' | 'secondary' | 'outline';

export function resolveContentActionVariant(
	variant: ContentActionVariant,
): ButtonVariant {
	return variant === 'outline' ? 'ghost' : variant;
}
