import { IconRenderer } from "@/shared/ui/icon-renderer";

type BrandIconProps = {
  platform: string;
  className?: string;
};

export function BrandIcon({ platform, className }: BrandIconProps) {
  const icon = getBrandIcon(platform);

  if (!icon) {
    return null;
  }

  return (
    <IconRenderer
      className={className}
      code={icon.code}
      library={icon.library}
      title={platform}
    />
  );
}

function getBrandIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return { code: "FaInstagram", library: "fa" };
    case "pinterest":
      return { code: "FaPinterest", library: "fa" };
    case "telegram":
      return { code: "FaTelegram", library: "fa" };
    case "vk":
      return { code: "FaVk", library: "fa" };
    case "whatsapp":
      return { code: "FaWhatsapp", library: "fa" };
    default:
      return null;
  }
}
