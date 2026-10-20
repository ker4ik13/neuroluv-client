import styles from './page.module.scss';

export default function NoticesPreviewPage() {
	return (
		<section className={styles.scrollArea}>
			<h2>Первая страница</h2>
			<p>
				Автоматически здесь открывается только первая модалка. Вторая доступна
				по кнопке — её правило привязано к другой странице.
			</p>
			<div className={styles.screen}>
				<span>Прокрутите ниже: один экран на ПК</span>
			</div>
			<div className={styles.screen}>
				<span>Два экрана на телефоне</span>
			</div>
			<p>Конец тестового материала.</p>
		</section>
	);
}
