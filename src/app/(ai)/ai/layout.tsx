import type { Metadata } from "next";

import { getHeaderNavigation } from "@/shared/api/directus/navigation";
import type { NavigationLogo } from "@/entities/navigation";
import { AiShell } from "@/widgets/ai-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Нейролюб AI — генерация текста, изображений и видео",
    template: "%s — Нейролюб AI",
  },
  description:
    "AI-студия Нейролюб: создавайте изображения, видео и тексты в одном интерфейсе.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  let logo: NavigationLogo | null = null;

  try {
    logo = (await getHeaderNavigation()).logo;
  } catch {
    // The text brand keeps the AI application usable if Directus is unavailable.
  }

  return <AiShell logo={logo}>{children}</AiShell>;
}
