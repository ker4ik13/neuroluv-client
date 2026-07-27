import type { Metadata } from "next";

import { getHeaderNavigation } from "@/shared/api/directus/navigation";
import { getFooterData } from "@/shared/api/directus/footer";
import type { FooterData } from "@/entities/footer";
import type { NavigationLogo } from "@/entities/navigation";
import { AiShell } from "@/widgets/ai-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Нейролюб Studio — генерация текста, изображений и видео",
    template: "%s — Нейролюб Studio",
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
  let footer: FooterData | null = null;

  const [navigationResult, footerResult] = await Promise.allSettled([
    getHeaderNavigation(),
    getFooterData(),
  ]);
  if (navigationResult.status === "fulfilled") logo = navigationResult.value.logo;
  if (footerResult.status === "fulfilled") footer = footerResult.value;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){try{var t=localStorage.getItem('neuroluv-ai:theme')||'system';var r=t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):t;document.documentElement.dataset.aiTheme=r;document.documentElement.style.colorScheme=r}catch(e){}})();",
        }}
      />
      <AiShell footer={footer} logo={logo}>{children}</AiShell>
    </>
  );
}
