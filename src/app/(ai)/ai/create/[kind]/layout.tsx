import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { CreateStudioPage } from "@/widgets/ai-pages";

import { CreateRouteScrollReset } from "./CreateRouteScrollReset";
import styles from "./layout.module.scss";

type RouteKind = "photo" | "text" | "video";

export default async function CreateKindLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isRouteKind(kind)) notFound();

  return (
    <>
      <CreateRouteScrollReset />
      <section className={styles.workspace}>
        <CreateStudioPage
          kind={kind === "photo" ? "image" : kind}
          semanticTitle={false}
          syncModelUrl
        />
      </section>
      {children}
    </>
  );
}

function isRouteKind(value: string): value is RouteKind {
  return value === "photo" || value === "text" || value === "video";
}
