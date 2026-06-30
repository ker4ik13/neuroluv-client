import type { Metadata } from "next";

import { Header } from "@/widgets/header";

import "./globals.scss";

export const metadata: Metadata = {
  title: "Нейролюб",
  description: "Галерея и студия AI-контента",
};

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
