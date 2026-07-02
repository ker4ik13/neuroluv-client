import type { IconType } from "react-icons";

import type { NavigationIcon } from "@/entities/navigation";
import {
  AiOutlineBulb,
  AiOutlineCheckCircle,
  AiOutlineCodepen,
  AiOutlineEdit,
  AiOutlineEye,
  AiOutlineFileText,
  AiOutlinePicture,
  AiOutlineInstagram,
  AiOutlineRead,
  AiOutlineTeam,
  AiOutlineVideoCamera,
} from "react-icons/ai";
import { FiZap } from "react-icons/fi";
import { FaTelegram } from "react-icons/fa6";
import { PiCpu } from "react-icons/pi";
import { RiBriefcaseLine, RiRobot2Line } from "react-icons/ri";

type AppIconProps = {
  icon: NavigationIcon | null;
  className?: string;
};

const ICONS: Record<string, IconType> = {
  bot: RiRobot2Line,
  "book-open": AiOutlineRead,
  briefcase: RiBriefcaseLine,
  check: AiOutlineCheckCircle,
  "check-circle": AiOutlineCheckCircle,
  codepen: AiOutlineCodepen,
  cpu: PiCpu,
  edit: AiOutlineEdit,
  eye: AiOutlineEye,
  "file-text": AiOutlineFileText,
  image: AiOutlinePicture,
  instagram: AiOutlineInstagram,
  lightbulb: AiOutlineBulb,
  pen: AiOutlineEdit,
  picture: AiOutlinePicture,
  read: AiOutlineRead,
  team: AiOutlineTeam,
  telegram: FaTelegram,
  users: AiOutlineTeam,
  video: AiOutlineVideoCamera,
  zap: FiZap,
};

export function AppIcon({ icon, className }: AppIconProps) {
  if (!icon) {
    return null;
  }

  const Icon = ICONS[icon.code];

  if (!Icon) {
    return null;
  }

  return <Icon aria-hidden="true" className={className} />;
}
