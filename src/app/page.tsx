import type { Metadata } from "next";

import { getPageSeoBySlug } from "@/shared/api/directus/seo";
import { buildPageMetadata } from "@/shared/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeoBySlug("/");

  return buildPageMetadata(seo);
}

export default function Home() {
  return null;
}
