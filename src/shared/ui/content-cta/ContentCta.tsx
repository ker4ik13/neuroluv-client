import { buttonClassName } from '@/shared/ui/button';
import {
	ContentActionButton,
	type ContentActionButtonData,
	resolveContentActionVariant,
} from '@/shared/ui/content-action-button';
import styles from './ContentCta.module.scss';

export function ContentCta({
	title,
	description,
	buttons,
	titleId,
	compact = false,
	className = '',
}: {
	title: string;
	description: string;
	buttons: readonly ContentActionButtonData[];
	titleId?: string;
	compact?: boolean;
	className?: string;
}) {
	return (
		<section
			className={`${styles.card} ${className}`}
			data-content-cta
			data-compact={compact}
		>
			<h2 id={titleId}>{title}</h2>
			{description && <p>{description}</p>}
			{buttons.length > 0 && (
				<div className={styles.actions}>
					{buttons.map((button, index) => (
						<ContentActionButton
							key={`${button.id}-${index}`}
							button={button}
							className={buttonClassName(
								resolveContentActionVariant(button.variant),
								styles.action,
							)}
						/>
					))}
				</div>
			)}
		</section>
	);
}
