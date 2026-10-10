'use client';
import { useAiLocale } from '@/features/ai-locale';
import {
	Select,
	type SelectOption,
	type SelectOptionGroup,
	type SelectProps,
} from '@/shared/ui/select';

export type AiSelectProps<Value extends string | number = string> = Omit<
	SelectProps<Value>,
	'locale'
>;
export type AiSelectOption<Value extends string | number = string> =
	SelectOption<Value>;
export type AiSelectOptionGroup = SelectOptionGroup;
export function AiSelect<Value extends string | number = string>(
	props: AiSelectProps<Value>,
) {
	const { locale } = useAiLocale();
	return <Select {...props} locale={locale} />;
}
