import type { NavigationIcon } from "@/entities/navigation";

export type DirectusContentButtonIcon = {
  title: string | null;
  code: string | null;
  library: string | null;
  is_active: boolean | null;
};

export function normalizeDirectusContentButtonIcon(
  icon: DirectusContentButtonIcon | null | undefined,
): NavigationIcon | null {
  if (!icon?.code || icon.is_active === false) {
    return null;
  }

  return {
    title: icon.title || icon.code,
    code: icon.code,
    library: icon.library || "custom",
  };
}
