import { createElement, type ReactNode } from "react";

type NoindexProps = {
  children: ReactNode;
};

export function Noindex({ children }: NoindexProps) {
  return createElement("noindex", { "data-nosnippet": "true" }, children);
}
