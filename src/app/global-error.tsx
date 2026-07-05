"use client";

import { ErrorPage } from "@/widgets/error-page";

import "./globals.scss";

export default function GlobalError() {
  return (
    <html lang="ru">
      <body>
        <main>
          <ErrorPage variant="500" />
        </main>
      </body>
    </html>
  );
}
