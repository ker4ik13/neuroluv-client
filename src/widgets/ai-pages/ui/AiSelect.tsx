"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

import { useAiLocale } from "@/features/ai-locale";

import styles from "./AiSelect.module.scss";

type AiSelectValue = string | number;

export type AiSelectOptionGroup = {
  key: string;
  label: string;
};

export type AiSelectOption<Value extends AiSelectValue = string> = {
  value: Value;
  label: string;
  href?: string;
  selectedLabel?: string;
  description?: string;
  visual?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  group?: AiSelectOptionGroup;
};

export type AiSelectProps<Value extends AiSelectValue = string> = {
  id: string;
  label?: string;
  options: readonly AiSelectOption<Value>[];
  value?: Value | null;
  onChange: (value: Value) => void;
  className?: string;
  description?: string;
  disabled?: boolean;
  error?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  compact?: boolean;
  labelVisuallyHidden?: boolean;
};

const TYPEAHEAD_RESET_MS = 700;
const LISTBOX_GAP_PX = 6;
const LISTBOX_MAX_HEIGHT_PX = 320;
const LISTBOX_MAX_WIDTH_PX = 480;
const LISTBOX_VIEWPORT_GUTTER_PX = 12;

type ListboxPlacement = "top" | "bottom";

type ListboxLayout = {
  inlineOffset: number;
  maxHeight: number;
  maxWidth: number;
  minWidth: number;
  placement: ListboxPlacement;
};

export function AiSelect<Value extends AiSelectValue = string>({
  id,
  label,
  options,
  value,
  onChange,
  className = "",
  description,
  disabled = false,
  error,
  name,
  placeholder,
  required = false,
  compact = false,
  labelVisuallyHidden = false,
}: AiSelectProps<Value>) {
  const { locale, t } = useAiLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listboxLayout, setListboxLayout] = useState<ListboxLayout>({
    inlineOffset: 0,
    maxHeight: LISTBOX_MAX_HEIGHT_PX,
    maxWidth: LISTBOX_MAX_WIDTH_PX,
    minWidth: 0,
    placement: "bottom",
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef(new Map<number, HTMLElement>());
  const typeaheadRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerId = `${id}-trigger`;
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const listboxId = `${id}-listbox`;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const selectedIndex = useMemo(
    () => options.findIndex((option) => Object.is(option.value, value)),
    [options, value],
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const resolvedPlaceholder = placeholder || t("Выберите значение", "Choose a value");
  const optionSections = useMemo(() => groupOptions(options), [options]);
  const resolvedActiveIndex =
    activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled
      ? activeIndex
      : selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : findEnabledOption(options, -1, 1);
  const isDisabled = disabled || options.length === 0;
  const activeOptionId =
    isOpen && resolvedActiveIndex >= 0
      ? getOptionId(id, resolvedActiveIndex)
      : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || resolvedActiveIndex < 0) return;

    optionRefs.current.get(resolvedActiveIndex)?.scrollIntoView({ block: "nearest" });
  }, [isOpen, resolvedActiveIndex]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const listbox = listboxRef.current;
    if (!trigger || !listbox) return;

    let animationFrameId = 0;

    const updateListboxLayout = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const visibleBounds = getVisibleVerticalBounds(trigger);
      const spaceAbove = Math.max(
        0,
        triggerRect.top - visibleBounds.top - LISTBOX_GAP_PX,
      );
      const spaceBelow = Math.max(
        0,
        visibleBounds.bottom - triggerRect.bottom - LISTBOX_GAP_PX,
      );
      const desiredHeight = Math.min(
        LISTBOX_MAX_HEIGHT_PX,
        Math.ceil(listbox.scrollHeight),
      );
      const placement: ListboxPlacement =
        spaceBelow < desiredHeight && spaceAbove > spaceBelow ? "top" : "bottom";
      const availableHeight = placement === "top" ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(
        0,
        Math.floor(Math.min(LISTBOX_MAX_HEIGHT_PX, availableHeight)),
      );
      const horizontalBounds = getVisibleHorizontalBounds(trigger);
      const availableWidth = Math.max(
        0,
        horizontalBounds.right - horizontalBounds.left,
      );
      const maxWidth = Math.floor(
        Math.min(LISTBOX_MAX_WIDTH_PX, availableWidth),
      );
      const minWidth = Math.min(Math.ceil(triggerRect.width), maxWidth);
      const listboxWidth = Math.min(
        Math.max(Math.ceil(listbox.getBoundingClientRect().width), minWidth),
        maxWidth,
      );
      const listboxLeft = Math.min(
        Math.max(triggerRect.left, horizontalBounds.left),
        Math.max(horizontalBounds.left, horizontalBounds.right - listboxWidth),
      );
      const inlineOffset = Math.round(listboxLeft - triggerRect.left);

      setListboxLayout((current) =>
        current.inlineOffset === inlineOffset &&
        current.maxHeight === maxHeight &&
        current.maxWidth === maxWidth &&
        current.minWidth === minWidth &&
        current.placement === placement
          ? current
          : { inlineOffset, maxHeight, maxWidth, minWidth, placement },
      );
    };

    const scheduleListboxLayoutUpdate = () => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(updateListboxLayout);
    };

    updateListboxLayout();
    window.addEventListener("resize", scheduleListboxLayoutUpdate);
    window.addEventListener("scroll", scheduleListboxLayoutUpdate, true);
    window.visualViewport?.addEventListener(
      "resize",
      scheduleListboxLayoutUpdate,
    );
    window.visualViewport?.addEventListener(
      "scroll",
      scheduleListboxLayoutUpdate,
    );

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleListboxLayoutUpdate);
    resizeObserver?.observe(trigger);
    resizeObserver?.observe(listbox);
    getClippingAncestors(trigger).forEach((ancestor) =>
      resizeObserver?.observe(ancestor),
    );

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", scheduleListboxLayoutUpdate);
      window.removeEventListener("scroll", scheduleListboxLayoutUpdate, true);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleListboxLayoutUpdate,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        scheduleListboxLayoutUpdate,
      );
      resizeObserver?.disconnect();
    };
  }, [isOpen, options]);

  useEffect(() => {
    if (!isDisabled) return;

    const timeoutId = window.setTimeout(() => setIsOpen(false), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isDisabled]);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
    };
  }, []);

  function open(preferredIndex?: number) {
    if (isDisabled) return;

    const initialIndex =
      preferredIndex !== undefined &&
      preferredIndex >= 0 &&
      !options[preferredIndex]?.disabled
        ? preferredIndex
        : selectedIndex >= 0 && !options[selectedIndex]?.disabled
          ? selectedIndex
          : findEnabledOption(options, -1, 1);

    setActiveIndex(initialIndex);
    setIsOpen(true);
  }

  function close({ restoreFocus = false } = {}) {
    setIsOpen(false);
    clearTypeahead();
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;

    onChange(option.value);
    setActiveIndex(index);
    close({ restoreFocus: true });
  }

  function handleOptionLinkClick(
    event: ReactMouseEvent<HTMLAnchorElement>,
    index: number,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      close();
      return;
    }

    event.preventDefault();
    selectOption(index);
  }

  function moveActive(direction: 1 | -1) {
    const nextIndex = findEnabledOption(options, resolvedActiveIndex, direction);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }

  function handleTypeahead(key: string) {
    const normalizedKey = key.toLocaleLowerCase(locale);
    const nextQuery = `${typeaheadRef.current}${normalizedKey}`;
    let matchIndex = findTypeaheadMatch(options, nextQuery, resolvedActiveIndex);

    if (matchIndex < 0 && nextQuery.length > 1) {
      typeaheadRef.current = normalizedKey;
      matchIndex = findTypeaheadMatch(options, normalizedKey, resolvedActiveIndex);
    } else {
      typeaheadRef.current = nextQuery;
    }

    if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
    typeaheadTimerRef.current = setTimeout(clearTypeahead, TYPEAHEAD_RESET_MS);

    if (matchIndex >= 0) {
      if (!isOpen) open(matchIndex);
      else setActiveIndex(matchIndex);
    }
  }

  function clearTypeahead() {
    typeaheadRef.current = "";
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
      typeaheadTimerRef.current = null;
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (isDisabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (isOpen) moveActive(1);
      else open(findEnabledOption(options, selectedIndex, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (isOpen) moveActive(-1);
      else open(findEnabledOption(options, selectedIndex, -1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      const firstIndex = findEnabledOption(options, -1, 1);
      if (isOpen) setActiveIndex(firstIndex);
      else open(firstIndex);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const lastIndex = findEnabledOption(options, 0, -1);
      if (isOpen) setActiveIndex(lastIndex);
      else open(lastIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isOpen && resolvedActiveIndex >= 0) selectOption(resolvedActiveIndex);
      else open();
      return;
    }

    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab") {
      close();
      return;
    }

    if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      handleTypeahead(event.key);
    }
  }

  return (
    <div
      className={`${styles.root} ${compact ? styles.rootCompact : ""} ${isOpen ? styles.rootOpen : ""} ${error ? styles.rootInvalid : ""} ${className}`}
      ref={rootRef}
    >
      {label &&

      <label className={`${styles.label} ${labelVisuallyHidden ? styles.visuallyHidden : ""}`} htmlFor={triggerId} id={labelId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      }

      <div className={styles.control}>
        <button
          aria-activedescendant={activeOptionId}
          aria-controls={listboxId}
          aria-describedby={describedBy}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-required={required || undefined}
          className={styles.trigger}
          disabled={isDisabled}
          id={triggerId}
          ref={triggerRef}
          role="combobox"
          type="button"
          onClick={() => {
            if (isOpen) close();
            else open();
          }}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.selectionMain} id={valueId}>
            {selectedOption?.visual ? (
              <span aria-hidden="true" className={styles.optionVisual}>
                {selectedOption.visual}
              </span>
            ) : null}
            <span className={styles.triggerContent}>
              <span className={selectedOption ? styles.value : styles.placeholder}>
                {selectedOption?.selectedLabel || selectedOption?.label || resolvedPlaceholder}
              </span>
              {selectedOption?.description ? (
                <span className={styles.valueDescription}>{selectedOption.description}</span>
              ) : null}
            </span>
            {selectedOption?.badge ? (
              <span className={styles.optionBadge}>{selectedOption.badge}</span>
            ) : null}
          </span>
          <FiChevronDown aria-hidden="true" className={styles.chevron} />
        </button>

        {isOpen ? (
          <ul
            aria-labelledby={labelId}
            className={`${styles.listbox} ${listboxLayout.placement === "top" ? styles.listboxTop : styles.listboxBottom}`}
            data-placement={listboxLayout.placement}
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            style={
              {
                left: listboxLayout.inlineOffset,
                maxHeight: listboxLayout.maxHeight,
                maxWidth: listboxLayout.maxWidth,
                minWidth: listboxLayout.minWidth,
              } as CSSProperties
            }
          >
            {optionSections.map((section, sectionIndex) => {
              const renderedOptions = section.options.map(({ option, index }) => {
                const optionClassName = `${styles.option} ${index === resolvedActiveIndex ? styles.optionActive : ""} ${index === selectedIndex ? styles.optionSelected : ""} ${option.disabled ? styles.optionDisabled : ""}`;
                const optionContents = (
                  <>
                  <span className={styles.selectionMain}>
                    {option.visual ? (
                      <span aria-hidden="true" className={styles.optionVisual}>
                        {option.visual}
                      </span>
                    ) : null}
                    <span className={styles.optionContent}>
                      <span className={styles.optionLabel}>{option.label}</span>
                      {option.description ? (
                        <span className={styles.optionDescription}>{option.description}</span>
                      ) : null}
                    </span>
                    {option.badge ? (
                      <span className={styles.optionBadge}>{option.badge}</span>
                    ) : null}
                  </span>
                  <span aria-hidden="true" className={styles.checkSlot}>
                    {index === selectedIndex ? <FiCheck /> : null}
                  </span>
                  </>
                );
                const setOptionRef = (element: HTMLElement | null) => {
                  if (element) optionRefs.current.set(index, element);
                  else optionRefs.current.delete(index);
                };
                const optionKey = `${typeof option.value}:${String(option.value)}`;
                const handleMouseMove = () => {
                  if (!option.disabled) setActiveIndex(index);
                };

                if (option.href && !option.disabled) {
                  return (
                    <li key={optionKey} role="presentation">
                      <Link
                        aria-selected={index === selectedIndex}
                        className={optionClassName}
                        href={option.href}
                        id={getOptionId(id, index)}
                        ref={setOptionRef}
                        role="option"
                        onClick={(event) => handleOptionLinkClick(event, index)}
                        onMouseMove={handleMouseMove}
                      >
                        {optionContents}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li
                    aria-disabled={option.disabled || undefined}
                    aria-selected={index === selectedIndex}
                    className={optionClassName}
                    id={getOptionId(id, index)}
                    key={optionKey}
                    ref={setOptionRef}
                    role="option"
                    onClick={() => selectOption(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={handleMouseMove}
                  >
                    {optionContents}
                  </li>
                );
              });

              if (!section.group) return renderedOptions;

              const groupLabelId = `${id}-group-${sectionIndex}-label`;
              return (
                <li
                  className={styles.optionGroup}
                  key={`group:${section.group.key}`}
                  role="presentation"
                >
                  <span className={styles.optionGroupLabel} id={groupLabelId}>
                    {section.group.label}
                  </span>
                  <ul
                    aria-labelledby={groupLabelId}
                    className={styles.optionGroupList}
                    role="group"
                  >
                    {renderedOptions}
                  </ul>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {name ? <input name={name} type="hidden" value={value == null ? "" : String(value)} /> : null}
      {description ? (
        <small className={styles.description} id={descriptionId}>
          {description}
        </small>
      ) : null}
      {error ? (
        <small aria-live="polite" className={styles.error} id={errorId}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

function findEnabledOption<Value extends AiSelectValue>(
  options: readonly AiSelectOption<Value>[],
  fromIndex: number,
  direction: 1 | -1,
): number {
  if (options.length === 0) return -1;

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (fromIndex + direction * offset + options.length) % options.length;
    if (!options[index]?.disabled) return index;
  }

  return -1;
}

function findTypeaheadMatch<Value extends AiSelectValue>(
  options: readonly AiSelectOption<Value>[],
  query: string,
  fromIndex: number,
): number {
  if (!query) return -1;

  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (Math.max(fromIndex, -1) + offset) % options.length;
    const option = options[index];
    if (
      option &&
      !option.disabled &&
      [option.label, option.selectedLabel, option.group?.label].some((candidate) =>
        candidate?.toLocaleLowerCase().startsWith(query),
      )
    ) {
      return index;
    }
  }

  return -1;
}

type IndexedOption<Value extends AiSelectValue> = {
  option: AiSelectOption<Value>;
  index: number;
};

type OptionSection<Value extends AiSelectValue> = {
  group: AiSelectOptionGroup | null;
  options: IndexedOption<Value>[];
};

function groupOptions<Value extends AiSelectValue>(
  options: readonly AiSelectOption<Value>[],
): OptionSection<Value>[] {
  const sections: OptionSection<Value>[] = [];
  const groupedSections = new Map<string, OptionSection<Value>>();

  options.forEach((option, index) => {
    if (!option.group) {
      sections.push({ group: null, options: [{ option, index }] });
      return;
    }

    const existing = groupedSections.get(option.group.key);
    if (existing) {
      existing.options.push({ option, index });
      return;
    }

    const section = { group: option.group, options: [{ option, index }] };
    groupedSections.set(option.group.key, section);
    sections.push(section);
  });

  return sections;
}

function getOptionId(id: string, index: number): string {
  return `${id}-option-${index}`;
}

function getVisibleVerticalBounds(element: HTMLElement): {
  top: number;
  bottom: number;
} {
  const visualViewport = window.visualViewport;
  let top = visualViewport?.offsetTop ?? 0;
  let bottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : window.innerHeight;

  getClippingAncestors(element).forEach((ancestor) => {
    const rect = ancestor.getBoundingClientRect();
    const contentTop = rect.top + ancestor.clientTop;
    const contentBottom = contentTop + ancestor.clientHeight;
    top = Math.max(top, contentTop);
    bottom = Math.min(bottom, contentBottom);
  });

  return { top, bottom: Math.max(top, bottom) };
}

function getVisibleHorizontalBounds(element: HTMLElement): {
  left: number;
  right: number;
} {
  const visualViewport = window.visualViewport;
  let left =
    (visualViewport?.offsetLeft ?? 0) + LISTBOX_VIEWPORT_GUTTER_PX;
  let right = visualViewport
    ? visualViewport.offsetLeft +
      visualViewport.width -
      LISTBOX_VIEWPORT_GUTTER_PX
    : window.innerWidth - LISTBOX_VIEWPORT_GUTTER_PX;
  let ancestor = element.parentElement;

  while (ancestor) {
    const { overflowX } = window.getComputedStyle(ancestor);
    if (overflowX !== "visible") {
      const rect = ancestor.getBoundingClientRect();
      const contentLeft = rect.left + ancestor.clientLeft;
      const contentRight = contentLeft + ancestor.clientWidth;
      left = Math.max(left, contentLeft);
      right = Math.min(right, contentRight);
    }
    ancestor = ancestor.parentElement;
  }

  return { left, right: Math.max(left, right) };
}

function getClippingAncestors(element: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let ancestor = element.parentElement;

  while (ancestor) {
    const { overflowY } = window.getComputedStyle(ancestor);
    if (overflowY !== "visible") ancestors.push(ancestor);
    ancestor = ancestor.parentElement;
  }

  return ancestors;
}
