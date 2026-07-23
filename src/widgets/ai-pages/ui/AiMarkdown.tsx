import { Fragment, type ReactNode } from "react";

import styles from "./AiMarkdown.module.scss";

type MarkdownBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: number; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; code: string }
  | { type: "divider" };

const INLINE_TOKEN =
  /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|`[^`\n]+?`|\[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^\s)]+\)|\*[^*\n]+?\*|_[^_\n]+?_)/g;

export function AiMarkdown({ children }: { children: string }) {
  const blocks = parseMarkdown(children);

  return (
    <div className={styles.markdown}>
      {blocks.map((block, index) => {
        const key = `${block.type}:${index}`;
        switch (block.type) {
          case "heading":
            return renderHeading(block.level, block.text, key);
          case "unordered-list":
            return (
              <ul key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}:${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol key={key}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${key}:${itemIndex}`}>{renderInlineMarkdown(item)}</li>
                ))}
              </ol>
            );
          case "quote":
            return <blockquote key={key}>{renderInlineMarkdown(block.text)}</blockquote>;
          case "code":
            return (
              <pre key={key}>
                <code>{block.code}</code>
              </pre>
            );
          case "divider":
            return <hr key={key} />;
          case "paragraph":
            return <p key={key}>{renderInlineMarkdown(block.text)}</p>;
        }
      })}
    </div>
  );
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.map((line) => line.trim()).filter(Boolean).join(" ");
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (/^```/.test(trimmed)) {
      flushParagraph();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^```/.test((lines[index] ?? "").trim())) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ type: "code", code: code.join("\n") });
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1]?.length ?? 2,
        text: heading[2] ?? "",
      });
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "divider" });
      continue;
    }

    const unordered = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unordered) {
      flushParagraph();
      const items = [unordered[1] ?? ""];
      while (index + 1 < lines.length) {
        const next = (lines[index + 1] ?? "").trim().match(/^[-*+]\s+(.+)$/);
        if (!next) break;
        items.push(next[1] ?? "");
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      const items = [ordered[1] ?? ""];
      while (index + 1 < lines.length) {
        const next = (lines[index + 1] ?? "").trim().match(/^\d+[.)]\s+(.+)$/);
        if (!next) break;
        items.push(next[1] ?? "");
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushParagraph();
      const quote = [trimmed.replace(/^>\s?/, "")];
      while (index + 1 < lines.length && (lines[index + 1] ?? "").trim().startsWith(">")) {
        quote.push((lines[index + 1] ?? "").trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

function renderHeading(level: number, text: string, key: string): ReactNode {
  const content = renderInlineMarkdown(text);
  if (level <= 1) return <h2 key={key}>{content}</h2>;
  if (level === 2) return <h3 key={key}>{content}</h3>;
  return <h4 key={key}>{content}</h4>;
}

function renderInlineMarkdown(source: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of source.matchAll(INLINE_TOKEN)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(source.slice(cursor, index));

    const key = `${index}:${token.length}`;
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      nodes.push(<strong key={key}>{renderInlineMarkdown(token.slice(2, -2))}</strong>);
    } else if (token.startsWith("~~") && token.endsWith("~~")) {
      nodes.push(<del key={key}>{renderInlineMarkdown(token.slice(2, -2))}</del>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else if (
      (token.startsWith("*") && token.endsWith("*")) ||
      (token.startsWith("_") && token.endsWith("_"))
    ) {
      nodes.push(<em key={key}>{renderInlineMarkdown(token.slice(1, -1))}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)$/);
      nodes.push(
        link ? (
          <a href={link[2]} key={key} rel="nofollow noreferrer" target="_blank">
            {link[1]}
          </a>
        ) : (
          <Fragment key={key}>{token}</Fragment>
        ),
      );
    }
    cursor = index + token.length;
  }

  if (cursor < source.length) nodes.push(source.slice(cursor));
  return nodes;
}
