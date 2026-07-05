import type { Metadata } from "next";

import { ErrorPage } from "@/widgets/error-page";

export const metadata: Metadata = {
  title: "Страница не найдена | Нейролюб",
};

export default function NotFound() {
  return <ErrorPage variant="404" />;
}
