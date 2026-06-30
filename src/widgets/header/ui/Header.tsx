import type { HeaderNavigation } from "@/entities/navigation";
import { getHeaderNavigation } from "@/shared/api/directus/navigation";

import { HeaderView } from "./HeaderView";

const FALLBACK_NAVIGATION: HeaderNavigation = {
  siteName: "Нейролюб",
  logo: null,
  items: [],
  socialLinks: [],
};

export async function Header() {
  let navigation = FALLBACK_NAVIGATION;

  try {
    navigation = await getHeaderNavigation();
  } catch {
    navigation = FALLBACK_NAVIGATION;
  }

  return <HeaderView navigation={navigation} />;
}
