import styles from '../page.module.scss';

export default function SecondNoticesPreviewPage() {
	return (
		<section className={styles.scrollArea}>
			<h2>Вторая страница</h2>
			<p>
				Здесь действует другая модалка, с другим текстом и без фотографии. Режим
				показа выбирается в панели выше.
			</p>
			<div className={styles.screen}>
				<span>Первый экран прокрутки</span>
			</div>
			<div className={styles.screen}>
				<span>Второй экран прокрутки</span>
			</div>
			<p>Конец второй страницы.</p>
		</section>
	);
}
