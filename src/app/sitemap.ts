import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => new URL(path, SITE_URL).toString();
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/menu"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
