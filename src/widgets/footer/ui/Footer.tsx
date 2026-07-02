import type { FooterData } from "@/entities/footer";
import { getFooterData } from "@/shared/api/directus/footer";

import { FooterView } from "./FooterView";

// const FALLBACK_FOOTER: FooterData = {
//   siteName: "Нейролюб",
//   description:
//     "AI-медиа, галерея промптов и студия контента для тех, кто создаёт фото, видео, UGC и визуал с помощью нейросетей.",
//   logo: null,
//   socialLinks: [],
//   columns: [
//     {
//       id: "sections",
//       title: "Разделы",
//       links: [
//         { id: "news", label: "Новости", href: "/news", target: "_self" },
//         { id: "gallery", label: "Галерея", href: "/gallery", target: "_self" },
//         { id: "articles", label: "Статьи", href: "/articles", target: "_self" },
//         { id: "services", label: "Услуги", href: "/services", target: "_self" },
//       ],
//     },
//   ],
//   copyrightText: "© 2026 Нейролюб. Все права защищены",
//   developerLabel: "@ker4ik13",
//   developerUrl: "https://t.me/ker4ik13",
//   legalLinks: [
//     {
//       id: "privacy",
//       label: "Политика конфиденциальности",
//       href: "/privacy",
//       target: "_self",
//     },
//     {
//       id: "contacts",
//       label: "Контакты",
//       href: "/contacts",
//       target: "_self",
//     },
//   ],
// };

export async function Footer() {
  let footer = {} as FooterData;

  try {
    footer = await getFooterData();
  } catch {
    // footer = FALLBACK_FOOTER;
  }

  return <FooterView footer={footer} />;
}
