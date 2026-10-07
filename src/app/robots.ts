import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // staff pages, APIs and old per-table QR links shouldn't appear in search
      disallow: ["/admin", "/api/", "/t/"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
