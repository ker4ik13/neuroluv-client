import type { Metadata } from "next";

import { ProfilePage } from "@/widgets/ai-pages";

export const metadata: Metadata = { title: "Профиль", robots: { index: false, follow: false } };

export default function Page() {
  return <ProfilePage />;
}

