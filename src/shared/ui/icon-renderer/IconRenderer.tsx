import { createElement, type ComponentType } from "react";
import type { IconType } from "react-icons";
import * as AiIcons from "react-icons/ai";
import * as BsIcons from "react-icons/bs";
import * as FaIcons from "react-icons/fa";

type IconRendererProps = {
  className?: string;
  code: string;
  library: string;
  title?: string;
};

type IconConfig = {
  code: string;
  library: "ai" | "bs" | "fa";
};

type IconProps = {
  "aria-hidden"?: boolean;
  "aria-label"?: string;
  className?: string;
};

const iconLibraries: Record<IconConfig["library"], Record<string, IconType>> = {
  ai: AiIcons,
  bs: BsIcons,
  fa: FaIcons,
};

const iconAliases: Record<string, IconConfig> = {
  bot: { library: "fa", code: "FaRobot" },
  "book-open": { library: "fa", code: "FaBookOpen" },
  briefcase: { library: "fa", code: "FaBriefcase" },
  BsBook: { library: "fa", code: "FaBookOpen" },
  BsCheckCircle: { library: "fa", code: "FaCheckCircle" },
  BsCheckLg: { library: "fa", code: "FaCheck" },
  BsEye: { library: "fa", code: "FaEye" },
  BsFileText: { library: "fa", code: "FaFileAlt" },
  BsImage: { library: "fa", code: "FaImage" },
  BsLightbulbFill: { library: "fa", code: "FaLightbulb" },
  BsPencil: { library: "fa", code: "FaPencilAlt" },
  check: { library: "fa", code: "FaCheck" },
  "check-circle": { library: "fa", code: "FaCheckCircle" },
  codepen: { library: "ai", code: "AiOutlineCodepen" },
  cpu: { library: "fa", code: "FaMicrochip" },
  edit: { library: "fa", code: "FaPencilAlt" },
  eye: { library: "fa", code: "FaEye" },
  "file-text": { library: "fa", code: "FaFileAlt" },
  FiArrowUpRight: { library: "fa", code: "FaArrowRight" },
  FiZap: { library: "fa", code: "FaBolt" },
  image: { library: "fa", code: "FaImage" },
  instagram: { library: "fa", code: "FaInstagram" },
  lightbulb: { library: "fa", code: "FaLightbulb" },
  pen: { library: "fa", code: "FaPencilAlt" },
  PiCpu: { library: "fa", code: "FaMicrochip" },
  picture: { library: "fa", code: "FaImage" },
  read: { library: "fa", code: "FaBookOpen" },
  RiBriefcaseLine: { library: "fa", code: "FaBriefcase" },
  RiRobot2Line: { library: "fa", code: "FaRobot" },
  team: { library: "ai", code: "AiOutlineTeam" },
  telegram: { library: "fa", code: "FaTelegram" },
  users: { library: "ai", code: "AiOutlineTeam" },
  video: { library: "ai", code: "AiOutlineVideoCamera" },
  zap: { library: "fa", code: "FaBolt" },
};

const libraryAliases = new Set(["custom", "react-icons"]);

export function IconRenderer({
  className,
  code,
  library,
  title,
}: IconRendererProps) {
  const Icon = getIconComponent(library, code);

  if (!Icon) {
    return null;
  }

  return createElement(Icon, {
    "aria-hidden": title ? undefined : true,
    "aria-label": title,
    className,
  });
}

function getIconComponent(
  library: string,
  code: string,
): ComponentType<IconProps> | null {
  const icon = resolveIconConfig(library, code);

  if (!icon) {
    return null;
  }

  const libraryIcons = iconLibraries[icon.library];
  const Icon = libraryIcons[icon.code];

  return typeof Icon === "function" ? Icon : null;
}

function resolveIconConfig(library: string, code: string): IconConfig | null {
  const normalizedLibrary = library.trim().toLowerCase();
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return null;
  }

  if (isSupportedLibrary(normalizedLibrary)) {
    if (!hasLibraryPrefix(normalizedLibrary, normalizedCode)) {
      return null;
    }

    return {
      code: normalizedCode,
      library: normalizedLibrary,
    };
  }

  if (libraryAliases.has(normalizedLibrary)) {
    return iconAliases[normalizedCode] || inferIconConfig(normalizedCode);
  }

  return iconAliases[normalizedCode] || null;
}

function isSupportedLibrary(library: string): library is IconConfig["library"] {
  return library === "ai" || library === "bs" || library === "fa";
}

function hasLibraryPrefix(
  library: IconConfig["library"],
  code: string,
): boolean {
  return code.startsWith(
    {
      ai: "Ai",
      bs: "Bs",
      fa: "Fa",
    }[library],
  );
}

function inferIconConfig(code: string): IconConfig | null {
  const library = code.startsWith("Ai")
    ? "ai"
    : code.startsWith("Bs")
      ? "bs"
      : code.startsWith("Fa")
        ? "fa"
        : null;

  return library ? { code, library } : null;
}
