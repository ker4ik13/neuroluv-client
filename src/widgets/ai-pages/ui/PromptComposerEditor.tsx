"use client";

import {
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiImage } from "react-icons/fi";

import { useAiLocale } from "@/features/ai-locale";

import styles from "./PromptComposerEditor.module.scss";

export type PromptComposerMention = {
  tag: string;
  name: string;
  previewUrl?: string | null;
};

type MentionQuery = {
  end: number;
  start: number;
  value: string;
};

export function PromptComposerEditor({
  maxLength,
  mentions,
  placeholder,
  value,
  onChange,
  onSubmit,
}: {
  maxLength: number;
  mentions: readonly PromptComposerMention[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const { t } = useAiLocale();
  const resolvedPlaceholder =
    placeholder.trim() || t("Напишите сообщение…", "Write a message…");
  const editorRef = useRef<HTMLDivElement>(null);
  const renderedMentionSignatureRef = useRef("");
  const [mentionQuery, setMentionQuery] = useState<MentionQuery | null>(null);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const listboxId = useId();
  const mentionSignature = useMemo(
    () =>
      mentions
        .map((mention) => `${mention.tag}:${mention.previewUrl || ""}:${mention.name}`)
        .join("|"),
    [mentions],
  );
  const filteredMentions = useMemo(() => {
    if (!mentionQuery) return [];
    const query = mentionQuery.value.toLocaleLowerCase("ru-RU");
    return mentions.filter((mention) => {
      const tag = mention.tag.replace(/^@/, "").toLocaleLowerCase("ru-RU");
      return (
        !query ||
        tag.includes(query) ||
        mention.name.toLocaleLowerCase("ru-RU").includes(query)
      );
    });
  }, [mentionQuery, mentions]);
  const menuOpen = mentionQuery !== null && filteredMentions.length > 0;
  const resolvedActiveMentionIndex =
    activeMentionIndex < filteredMentions.length ? activeMentionIndex : 0;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = serializeEditor(editor);
    if (
      currentValue === value &&
      renderedMentionSignatureRef.current === mentionSignature
    ) {
      return;
    }

    const caretOffset = editor.contains(document.activeElement)
      ? getCaretOffset(editor)
      : null;
    renderEditorValue(editor, value, mentions);
    renderedMentionSignatureRef.current = mentionSignature;
    if (caretOffset !== null) {
      setCaretOffset(editor, Math.min(caretOffset, value.length));
    }
  }, [mentionSignature, mentions, value]);

  function updateMentionQuery() {
    const editor = editorRef.current;
    if (!editor) return;
    const caret = getCaretOffset(editor);
    if (caret === null) {
      setMentionQuery(null);
      return;
    }

    const text = serializeEditor(editor);
    const beforeCaret = text.slice(0, caret);
    const match = beforeCaret.match(/(?:^|[\s([{])@([\p{L}\p{N}_-]*)$/u);
    if (!match) {
      setMentionQuery(null);
      return;
    }

    const query = match[1] || "";
    setMentionQuery({
      start: caret - query.length - 1,
      end: caret,
      value: query,
    });
    setActiveMentionIndex(0);
  }

  function syncValueFromEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = serializeEditor(editor);
    if (nextValue.length > maxLength) {
      const limitedValue = nextValue.slice(0, maxLength);
      renderEditorValue(editor, limitedValue, mentions);
      setCaretOffset(editor, limitedValue.length);
      onChange(limitedValue);
    } else {
      onChange(nextValue);
    }
    updateMentionQuery();
  }

  function insertMention(mention: PromptComposerMention) {
    const editor = editorRef.current;
    if (!editor || !mentionQuery) return;
    const currentValue = serializeEditor(editor);
    const needsTrailingSpace =
      mentionQuery.end >= currentValue.length ||
      !/^\s/u.test(currentValue.slice(mentionQuery.end));
    const suffix = needsTrailingSpace ? " " : "";
    const nextValue = `${currentValue.slice(0, mentionQuery.start)}${mention.tag}${suffix}${currentValue.slice(mentionQuery.end)}`;
    const nextCaret = mentionQuery.start + mention.tag.length + suffix.length;

    renderEditorValue(editor, nextValue, mentions);
    renderedMentionSignatureRef.current = mentionSignature;
    setCaretOffset(editor, nextCaret);
    setMentionQuery(null);
    onChange(nextValue);
  }

  function handleInput() {
    syncValueFromEditor();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.nativeEvent.isComposing) return;

    if (menuOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveMentionIndex((current) => (current + 1) % filteredMentions.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveMentionIndex(
          (current) => (current - 1 + filteredMentions.length) % filteredMentions.length,
        );
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMentionQuery(null);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        const mention = filteredMentions[resolvedActiveMentionIndex];
        if (mention) insertMention(mention);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
    if (event.clipboardData.files.length > 0) return;
    event.preventDefault();
    insertPlainText(event.clipboardData.getData("text/plain"));
    syncValueFromEditor();
  }

  function insertPlainText(text: string) {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;

    range.deleteContents();
    const fragment = document.createDocumentFragment();
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    let lastNode: Node | null = null;
    lines.forEach((line, index) => {
      if (index > 0) {
        const br = document.createElement("br");
        fragment.append(br);
        lastNode = br;
      }
      if (line) {
        const textNode = document.createTextNode(line);
        fragment.append(textNode);
        lastNode = textNode;
      }
    });
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  return (
    <div className={styles.root}>
      <div
        aria-autocomplete="list"
        aria-controls={menuOpen ? listboxId : undefined}
        aria-label={t("Сообщение", "Message")}
        aria-multiline="true"
        className={styles.editor}
        contentEditable
        data-empty={value.length === 0}
        data-placeholder={resolvedPlaceholder}
        ref={editorRef}
        role="textbox"
        spellCheck
        suppressContentEditableWarning
        onBlur={() => {
          window.requestAnimationFrame(() => {
            if (!editorRef.current?.contains(document.activeElement)) {
              setMentionQuery(null);
            }
          });
        }}
        onClick={updateMentionQuery}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (!["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(event.key)) {
            updateMentionQuery();
          }
        }}
        onPaste={handlePaste}
      />

      {menuOpen ? (
        <div
          aria-label={t("Быстрая вставка изображений", "Quick image insertion")}
          className={styles.mentionMenu}
          id={listboxId}
          role="listbox"
        >
          {filteredMentions.map((mention, index) => (
            <button
              aria-selected={index === resolvedActiveMentionIndex}
              className={
                index === resolvedActiveMentionIndex
                  ? styles.mentionOptionActive
                  : undefined
              }
              key={mention.tag}
              role="option"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveMentionIndex(index)}
              onClick={() => insertMention(mention)}
            >
              <span className={styles.mentionPreview}>
                {mention.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  <img alt="" src={mention.previewUrl} />
                ) : (
                  <FiImage aria-hidden="true" />
                )}
              </span>
              <span>
                <strong>{mention.tag}</strong>
                <small>{mention.name}</small>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderEditorValue(
  editor: HTMLElement,
  value: string,
  mentions: readonly PromptComposerMention[],
) {
  const fragment = document.createDocumentFragment();
  const mentionByTag = new Map(
    mentions.map((mention) => [mention.tag.toLocaleLowerCase("ru-RU"), mention]),
  );
  const tags = [...mentionByTag.keys()].sort((left, right) => right.length - left.length);
  const patterns = [
    ...tags.map(escapeRegExp),
    String.raw`\[[^\]\n]{1,100}\]`,
  ];
  const matcher = new RegExp(patterns.join("|"), "giu");
  let offset = 0;

  for (const match of value.matchAll(matcher)) {
    const index = match.index ?? 0;
    appendPlainText(fragment, value.slice(offset, index));
    const mention = mentionByTag.get(match[0].toLocaleLowerCase("ru-RU"));
    if (mention) {
      fragment.append(createMentionNode(mention));
    } else {
      fragment.append(createVariableNode(match[0]));
    }
    offset = index + match[0].length;
  }
  appendPlainText(fragment, value.slice(offset));
  editor.replaceChildren(fragment);
}

function createMentionNode(mention: PromptComposerMention): HTMLElement {
  const node = document.createElement("span");
  node.className = styles.inlineMention;
  node.contentEditable = "false";
  node.dataset.promptMention = mention.tag;
  node.title = mention.name;

  if (mention.previewUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = mention.previewUrl;
    node.append(image);
  } else {
    const placeholder = document.createElement("span");
    placeholder.className = styles.inlineMentionPlaceholder;
    placeholder.textContent = "▧";
    node.append(placeholder);
  }

  const label = document.createElement("span");
  label.textContent = mention.tag;
  node.append(label);
  return node;
}

function createVariableNode(token: string): HTMLElement {
  const node = document.createElement("span");
  node.className = styles.inlineVariable;
  node.contentEditable = "false";
  node.dataset.promptVariable = token;
  node.textContent = token;
  node.title = "Нажмите и введите значение";
  node.setAttribute("aria-label", `${token}. Нажмите и введите значение`);
  node.addEventListener("click", () => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNode(node);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  return node;
}

function appendPlainText(parent: Node, value: string) {
  value.split("\n").forEach((line, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    if (line) parent.appendChild(document.createTextNode(line));
  });
}

function serializeEditor(root: Node): string {
  return Array.from(root.childNodes).map(serializeNode).join("");
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (!(node instanceof HTMLElement)) {
    return Array.from(node.childNodes).map(serializeNode).join("");
  }
  if (node.dataset.promptMention) return node.dataset.promptMention;
  if (node.dataset.promptVariable) return node.dataset.promptVariable;
  if (node.tagName === "BR") return "\n";
  return Array.from(node.childNodes).map(serializeNode).join("");
}

function getCaretOffset(editor: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  const beforeCaret = range.cloneRange();
  beforeCaret.selectNodeContents(editor);
  beforeCaret.setEnd(range.endContainer, range.endOffset);
  return serializeEditor(beforeCaret.cloneContents()).length;
}

function setCaretOffset(editor: HTMLElement, targetOffset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const units = collectCaretUnits(editor);
  let consumed = 0;
  const range = document.createRange();

  for (const unit of units) {
    const next = consumed + unit.length;
    if (targetOffset <= next) {
      if (unit.kind === "text") {
        range.setStart(unit.node, Math.max(0, targetOffset - consumed));
      } else {
        range.setStartAfter(unit.node);
      }
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editor.focus();
      return;
    }
    consumed = next;
  }

  range.selectNodeContents(editor);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  editor.focus();
}

function collectCaretUnits(root: Node): Array<{
  kind: "atomic" | "text";
  length: number;
  node: Node;
}> {
  const units: Array<{ kind: "atomic" | "text"; length: number; node: Node }> = [];
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      units.push({ kind: "text", length: node.textContent?.length || 0, node });
      return;
    }
    if (
      node instanceof HTMLElement &&
      (node.dataset.promptMention || node.dataset.promptVariable)
    ) {
      const atomicValue =
        node.dataset.promptMention || node.dataset.promptVariable || "";
      units.push({
        kind: "atomic",
        length: atomicValue.length,
        node,
      });
      return;
    }
    if (node instanceof HTMLElement && node.tagName === "BR") {
      units.push({ kind: "atomic", length: 1, node });
      return;
    }
    units.push(...collectCaretUnits(node));
  });
  return units;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
