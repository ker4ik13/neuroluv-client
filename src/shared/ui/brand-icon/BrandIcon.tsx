import {
  FaInstagram,
  FaPinterest,
  FaTelegram,
  FaVk,
  FaWhatsapp,
} from "react-icons/fa6";

type BrandIconProps = {
  platform: string;
  className?: string;
};

export function BrandIcon({ platform, className }: BrandIconProps) {
  switch (platform) {
    case "telegram":
      return <FaTelegram aria-hidden="true" className={className} />;
    case "vk":
      return <FaVk aria-hidden="true" className={className} />;
    case "pinterest":
      return <FaPinterest aria-hidden="true" className={className} />;
    case "whatsapp":
      return <FaWhatsapp aria-hidden="true" className={className} />;
    case "instagram":
      return <FaInstagram aria-hidden="true" className={className} />;
    default:
      return null;
  }
}
