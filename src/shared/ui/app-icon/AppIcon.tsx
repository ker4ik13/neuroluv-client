import type { IconType } from "react-icons";

import type { NavigationIcon } from "@/entities/navigation";
import {
  AiOutlineBulb,
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
import { RiBriefcaseLine, RiRobot2Line } from "react-icons/ri";

type AppIconProps = {
  icon: NavigationIcon | null;
  className?: string;
};

const ICONS: Record<string, IconType> = {
  bot: RiRobot2Line,
  "book-open": AiOutlineRead,
  briefcase: RiBriefcaseLine,
  codepen: AiOutlineCodepen,
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
  users: AiOutlineTeam,
  video: AiOutlineVideoCamera,
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
