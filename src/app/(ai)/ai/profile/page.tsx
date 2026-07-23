import type { Metadata } from "next";

import { buildAiPageMetadata } from "@/shared/lib/seo/ai-metadata";
import { ProfilePage } from "@/widgets/ai-pages";

export function generateMetadata(): Promise<Metadata> {
  return buildAiPageMetadata("/ai/profile", {
    title: "Профиль",
    description: "Настройки аккаунта и способы входа.",
  });
}

export default function Page() {
  return <ProfilePage />;
}
