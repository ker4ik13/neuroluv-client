import type { Metadata } from "next";

import { getHeaderNavigation } from "@/shared/api/directus/navigation";
import { getSiteSeo } from "@/shared/api/directus/seo";
import { buildSiteJsonLd } from "@/shared/lib/seo/json-ld";
import { buildSiteMetadata } from "@/shared/lib/seo/metadata";
import { JsonLd } from "@/shared/ui/json-ld";
import { YandexMetrika } from "@/shared/ui/yandex-metrika";
import { Footer } from "@/widgets/footer";
import { Header } from "@/widgets/header";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();

  return buildSiteMetadata(seo);
}

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [seo, navigation] = await Promise.all([
    getSiteSeo(),
    getHeaderNavigation().catch(() => null),
  ]);

  return (
    <>
      <JsonLd data={buildSiteJsonLd(seo, navigation)} />
      <Header navigation={navigation} />
      <main>{children}</main>
      <Footer />
      <YandexMetrika />
    </>
  );
}
