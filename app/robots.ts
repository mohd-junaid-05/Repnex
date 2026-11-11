import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://repnex.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/landing", "/sign-in", "/sign-up"],
        disallow: ["/api/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
