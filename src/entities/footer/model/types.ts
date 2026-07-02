import type { NavigationLogo, SocialLink } from "@/entities/navigation";

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  target: "_self" | "_blank";
};

export type FooterColumn = {
  id: string;
  title: string;
  links: FooterLink[];
};

export type FooterData = {
  siteName: string;
  description: string;
  logo: NavigationLogo | null;
  socialLinks: SocialLink[];
  columns: FooterColumn[];
  copyrightText: string;
  developerLabel: string | null;
  developerUrl: string | null;
  legalLinks: FooterLink[];
};
