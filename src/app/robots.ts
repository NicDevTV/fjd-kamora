import type { MetadataRoute } from "next";

// A fictional roleplay site: it should not show up in search engines. Everything is closed to crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
