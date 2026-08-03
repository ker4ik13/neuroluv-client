import type { Metadata } from "next";

import { YANDEX_METRIKA_ID } from "@/shared/config/analytics";
import { AnalyticsQueryPersistence } from "@/shared/ui/analytics-query-persistence";
import { YandexMetrika } from "@/shared/ui/yandex-metrika";

import "./globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://neuroluv.ru"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>
        <AnalyticsQueryPersistence />
        {children}
        <YandexMetrika counterId={YANDEX_METRIKA_ID} />
      </body>
    </html>
  );
}
