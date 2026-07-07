import type { Metadata } from "next";

import { getSiteSeo } from "@/shared/api/directus/seo";
import { buildSiteJsonLd } from "@/shared/lib/seo/json-ld";
import { buildSiteMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { YandexMetrika } from "@/shared/ui/yandex-metrika";
import { Footer } from "@/widgets/footer";
import { Header } from "@/widgets/header";

import "./globals.scss";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();

  return buildSiteMetadata(seo);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seo = await getSiteSeo();

  return (
    <html lang="ru">
      <head>
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
        <link href="/favicon.svg" rel="shortcut icon" type="image/svg+xml" />
        <link href="/favicon.svg" rel="apple-touch-icon" type="image/svg+xml" />
        <link href="/manifest.webmanifest" rel="manifest" />
      </head>
      <body>
        <JsonLd data={buildSiteJsonLd(seo)} />
        <Header />
        <main>{children}</main>
        <Footer />
        <YandexMetrika />
      </body>
    </html>
  );
}
