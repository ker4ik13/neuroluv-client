import type { Metadata } from "next";

import { MATOMO_BOOTSTRAP, YANDEX_METRIKA_ID } from "@/shared/config/analytics";
import { Matomo, MatomoHead } from "@/shared/ui/matomo";
import { AnalyticsQueryPersistence } from "@/shared/ui/analytics-query-persistence";
import {
  YandexMetrika,
  YandexMetrikaHead,
} from "@/shared/ui/yandex-metrika";

import "./globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://neuroluv.ru"),
  alternates: {
    types: {
      "application/rss+xml": "/yandex-news.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <head>
        <YandexMetrikaHead counterId={YANDEX_METRIKA_ID} />
        <MatomoHead bootstrap={MATOMO_BOOTSTRAP} />
      </head>
      <body>
        <YandexMetrika counterId={YANDEX_METRIKA_ID} />
        <Matomo />
        <AnalyticsQueryPersistence />
        {children}
      </body>
    </html>
  );
}
