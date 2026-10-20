'use client';

import {
	type ReactNode,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useBodyScrollLock } from '@/shared/lib/dom/useBodyScrollLock';
import { useFocusTrap } from '@/shared/lib/dom/useFocusTrap';
import styles from './Dialog.module.scss';

const subscribe = () => () => undefined;

export function Dialog({
	titleId,
	children,
	onClose,
}: {
	titleId: string;
	children: ReactNode;
	onClose: () => void;
}) {
	const mounted = useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
	const ref = useRef<HTMLDialogElement>(null);
	const [closing, setClosing] = useState(false);
	const closeRef = useRef(onClose);
	useEffect(() => {
		closeRef.current = onClose;
	}, [onClose]);
	useBodyScrollLock(mounted);
	useFocusTrap(mounted, ref);
	useEffect(() => {
		if (!mounted) return;
		const dialog = ref.current;
		dialog?.showModal();
		return () => {
			dialog?.close();
		};
	}, [mounted]);
	useEffect(() => {
		if (!closing) return;
		const timer = window.setTimeout(
			() => closeRef.current(),
			window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160,
		);
		return () => window.clearTimeout(timer);
	}, [closing]);
	return mounted
		? createPortal(
				<dialog
					ref={ref}
					className={styles.dialog}
					aria-labelledby={titleId}
					aria-modal='true'
					data-site-dialog
					data-closing={closing}
					onCancel={(event) => {
						event.preventDefault();
						setClosing(true);
					}}
					onClick={(event) => {
						if (event.target !== event.currentTarget) return;
						const rect = event.currentTarget.getBoundingClientRect();
						if (
							event.clientX < rect.left ||
							event.clientX > rect.right ||
							event.clientY < rect.top ||
							event.clientY > rect.bottom
						)
							setClosing(true);
					}}
				>
					<button
						type='button'
						aria-label='Закрыть окно'
						className={styles.close}
						onClick={() => setClosing(true)}
					>
						<FiX aria-hidden='true' />
					</button>
					{children}
				</dialog>,
				document.body,
			)
		: null;
}
