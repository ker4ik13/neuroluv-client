import type { Metadata } from "next";

import { AuthPage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Вход", robots: { index: false, follow: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const returnTo = sanitizeAiReturnTo(firstValue(query.returnTo));
  const authError = firstValue(query.authError)?.slice(0, 128);

  return <AuthPage initialAuthError={authError} initialReturnTo={returnTo} />;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sanitizeAiReturnTo(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/ai/create";
  }

  try {
    const parsed = new URL(value, "https://return-to.invalid");
    if (parsed.pathname !== "/ai" && !parsed.pathname.startsWith("/ai/")) {
      return "/ai/create";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/ai/create";
  }
}
