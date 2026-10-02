import type { MetadataRoute } from "next";

const BASE_URL = "https://igura-rw.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/admin/", "/api/", "/payment/", "/compare?"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
