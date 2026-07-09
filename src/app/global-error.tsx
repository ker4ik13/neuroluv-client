"use client";

import { ErrorPage } from "@/widgets/error-page";

import "./globals.scss";

export default function GlobalError() {
  return (
    <html lang="ru">
      <head>
        <title>Сервер немного шалит | Нейролюб</title>
        <meta
          name="description"
          content="Произошла ошибка на сервере. Попробуйте обновить страницу или вернуться на главную Нейролюба."
        />
        <meta name="robots" content="noindex,follow" />
      </head>
      <body>
        <main>
          <ErrorPage variant="500" />
        </main>
      </body>
    </html>
  );
}
