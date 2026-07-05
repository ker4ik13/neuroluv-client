import type { NavigationIcon } from "@/entities/navigation";
import { IconRenderer } from "@/shared/ui/icon-renderer";

type AppIconProps = {
  icon: NavigationIcon | null;
  className?: string;
};

export function AppIcon({ icon, className }: AppIconProps) {
  if (!icon) {
    return null;
  }

  return (
    <IconRenderer
      className={className}
      code={icon.code}
      library={icon.library}
      title={icon.title}
    />
  );
}
