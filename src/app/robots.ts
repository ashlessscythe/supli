import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard/",
        "/kiosk/",
        "/api/",
        "/accept-invite/",
        "/reset-password/",
      ],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
