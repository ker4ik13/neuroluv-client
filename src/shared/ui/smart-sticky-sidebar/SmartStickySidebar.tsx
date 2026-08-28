"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const DESKTOP_MEDIA_QUERY = "(min-width: 1025px)";
const DEFAULT_TOP_OFFSET = 82;
const DEFAULT_BOTTOM_OFFSET = 20;

type SmartStickyStyle = CSSProperties & {
  "--smart-sticky-top"?: string;
};

type SmartStickySidebarProps = {
  children: ReactNode;
  className?: string;
  topOffset?: number;
  bottomOffset?: number;
};

export function SmartStickySidebar({
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
  children,
  className,
  topOffset = DEFAULT_TOP_OFFSET,
}: SmartStickySidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const stickyTopRef = useRef(topOffset);
  const [stickyTop, setStickyTop] = useState(topOffset);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const applyStickyTop = (nextTop: number) => {
      const roundedTop = Math.round(nextTop);

      if (stickyTopRef.current === roundedTop) {
        return;
      }

      stickyTopRef.current = roundedTop;
      setStickyTop(roundedTop);
    };

    const updateStickyTop = () => {
      const scrollY = window.scrollY;
      const scrollDelta = scrollY - lastScrollYRef.current;

      if (!mediaQuery.matches) {
        lastScrollYRef.current = scrollY;
        applyStickyTop(topOffset);
        return;
      }

      const sidebar = sidebarRef.current;

      if (!sidebar) {
        return;
      }

      const sidebarHeight = sidebar.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;
      const hasScrollableSidebar =
        sidebarHeight + topOffset + bottomOffset > viewportHeight;

      if (!hasScrollableSidebar) {
        lastScrollYRef.current = scrollY;
        applyStickyTop(topOffset);
        return;
      }

      const bottomAlignedTop = viewportHeight - sidebarHeight - bottomOffset;
      const minTop = Math.min(topOffset, bottomAlignedTop);

      if (scrollDelta === 0) {
        lastScrollYRef.current = scrollY;
        applyStickyTop(Math.min(topOffset, Math.max(minTop, stickyTopRef.current)));
        return;
      }

      const nextTop =
        scrollDelta > 0
          ? Math.max(minTop, stickyTopRef.current - scrollDelta)
          : Math.min(topOffset, stickyTopRef.current - scrollDelta);

      lastScrollYRef.current = scrollY;
      applyStickyTop(nextTop);
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateStickyTop();
      });
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);

    if (sidebarRef.current) {
      resizeObserver.observe(sidebarRef.current);
    }

    lastScrollYRef.current = window.scrollY;
    updateStickyTop();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    mediaQuery.addEventListener("change", scheduleUpdate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }

      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      mediaQuery.removeEventListener("change", scheduleUpdate);
    };
  }, [bottomOffset, topOffset]);

  const style: SmartStickyStyle = {
    "--smart-sticky-top": `${stickyTop}px`,
  };

  return (
    <aside className={className} ref={sidebarRef} style={style}>
      {children}
    </aside>
  );
}
