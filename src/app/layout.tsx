import type { Metadata } from "next";

import { getSiteSeo } from "@/shared/api/directus/seo";
import { buildSiteMetadata } from "@/shared/lib/seo/metadata";
import { Header } from "@/widgets/header";

import "./globals.scss";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();

  return buildSiteMetadata(seo);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
