import { createElement, type CSSProperties, type ReactNode } from "react";

type NoindexProps = {
  children: ReactNode;
};

const noindexStyle: CSSProperties = {
  display: "contents",
};

export function Noindex({ children }: NoindexProps) {
  return createElement(
    "noindex",
    { "data-nosnippet": "true", style: noindexStyle },
    children,
  );
}
