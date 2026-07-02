import type { NextConfig } from "next";

const directusUrl = new URL(
  process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://dev.cms.neuroluv.ru",
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: directusUrl.protocol.replace(":", "") as "http" | "https",
        hostname: directusUrl.hostname,
        port: directusUrl.port,
        pathname: "/assets/**",
      },
    ],
  },
};

export default nextConfig;
