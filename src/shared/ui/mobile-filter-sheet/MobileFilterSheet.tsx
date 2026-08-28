"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { FaFilter, FaTimes } from "react-icons/fa";

import { useBodyScrollLock } from "@/shared/lib/dom/useBodyScrollLock";

import styles from "./MobileFilterSheet.module.scss";

const CLOSE_DRAG_DISTANCE = 96;
const MOBILE_FILTER_MEDIA_QUERY = "(max-width: 768px)";

function subscribeToHydration() {
  return () => undefined;
}

type MobileFilterSheetProps = {
  children: ReactNode;
  label?: string;
  title?: string;
};

type SheetStyle = CSSProperties & {
  "--mobile-filter-sheet-drag"?: string;
};

export function MobileFilterSheet({
  children,
  label = "Фильтры",
  title = "Фильтры",
}: MobileFilterSheetProps) {
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const isMounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousFocus = document.activeElement;
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);

      if (
        previousFocus instanceof HTMLElement &&
        document.contains(previousFocus)
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_FILTER_MEDIA_QUERY);

    function handleMediaChange() {
      if (!mediaQuery.matches) {
        setIsOpen(false);
      }
    }

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  function closeSheet() {
    setIsOpen(false);
    setIsDragging(false);
    dragOffsetRef.current = 0;
    setDragOffset(0);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);

    if (dragOffsetRef.current >= CLOSE_DRAG_DISTANCE) {
      closeSheet();
      return;
    }

    dragOffsetRef.current = 0;
    setDragOffset(0);
  }

  const sheetStyle: SheetStyle = {
    "--mobile-filter-sheet-drag": `${dragOffset}px`,
  };

  return (
    <div className={styles.triggerWrap}>
      <button
        aria-expanded={isOpen}
        className={styles.trigger}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <FaFilter aria-hidden="true" />
        <span>{label}</span>
      </button>

      {isMounted &&
        createPortal(
          <div
            aria-hidden={!isOpen}
            className={`${styles.portal} ${isOpen ? styles.portalOpen : ""}`}
          >
            <button
              aria-label="Закрыть фильтры"
              className={styles.backdrop}
              tabIndex={isOpen ? 0 : -1}
              type="button"
              onClick={closeSheet}
            />
            <section
              aria-labelledby={titleId}
              aria-modal="true"
              className={`${styles.sheet} ${isOpen ? styles.sheetOpen : ""} ${
                isDragging ? styles.sheetDragging : ""
              }`}
              role="dialog"
              style={sheetStyle}
            >
              <div
                className={styles.sheetHeader}
                onPointerCancel={finishDrag}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={finishDrag}
              >
                <span aria-hidden="true" className={styles.dragHandle} />
                <h2 id={titleId}>{title}</h2>
                <button
                  aria-label="Закрыть фильтры"
                  className={styles.closeButton}
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeSheet}
                >
                  <FaTimes aria-hidden="true" />
                </button>
              </div>
              <div
                className={styles.sheetContent}
                onClickCapture={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.target.closest("a")
                  ) {
                    closeSheet();
                  }
                }}
              >
                {children}
              </div>
            </section>
          </div>,
          document.body,
        )}
    </div>
  );
}
