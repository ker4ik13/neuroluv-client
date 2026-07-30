import type { HeaderNavigation } from "@/entities/navigation";
import { getHeaderNavigation } from "@/shared/api/directus/navigation";

import { HeaderView } from "./HeaderView";

const FALLBACK_NAVIGATION: HeaderNavigation = {
  siteName: "Нейролюб",
  logo: null,
  items: [],
  socialLinks: [],
};

type HeaderProps = {
  navigation?: HeaderNavigation | null;
};

export async function Header({ navigation: providedNavigation }: HeaderProps = {}) {
  let navigation = providedNavigation || FALLBACK_NAVIGATION;

  if (providedNavigation === undefined) {
    try {
      navigation = await getHeaderNavigation();
    } catch {
      navigation = FALLBACK_NAVIGATION;
    }
  }

  return <HeaderView navigation={navigation} />;
}
