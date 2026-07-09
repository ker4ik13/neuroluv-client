import type { Metadata } from "next";

import { ErrorPage } from "@/widgets/error-page";

export const metadata: Metadata = {
  title: "Страница убежала с сайта | Нейролюб",
  description:
    "Страница не найдена. Вернитесь на главную Нейролюба или перейдите к новостям, статьям и промптам.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return <ErrorPage variant="404" />;
}
