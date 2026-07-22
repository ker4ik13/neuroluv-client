"use client";

import { useEffect } from "react";

import { ErrorPage } from "@/widgets/error-page";

export default function Error() {
  useEffect(() => {
    document.title = "Сервер немного шалит | Нейролюб";

    let description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );

    if (!description) {
      description = document.createElement("meta");
      description.name = "description";
      document.head.append(description);
    }

    description.content =
      "Произошла ошибка на сервере. Попробуйте обновить страницу или вернуться на главную Нейролюба.";
  }, []);

  return <ErrorPage variant="500" />;
}
