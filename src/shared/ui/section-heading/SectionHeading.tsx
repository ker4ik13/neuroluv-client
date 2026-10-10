import styles from './SectionHeading.module.scss';

export function SectionHeading({
	title,
	description,
	align = 'center',
}: {
	title: string;
	description?: string | null;
	align?: 'center' | 'split';
}) {
	return (
		<header className={styles.heading} data-align={align}>
			<h2>{title}</h2>
			{description && <p>{description}</p>}
		</header>
	);
}
