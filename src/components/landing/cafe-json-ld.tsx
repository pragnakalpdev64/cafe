import type { CafeDetails } from "@/lib/data/menu";
import { SITE_URL } from "@/lib/site-url";

/** Structured data so Google can show the café's details (schema.org CafeOrCoffeeShop). */
export function CafeJsonLd({ cafe }: { cafe: CafeDetails }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: cafe.name,
    slogan: cafe.tagline,
    url: SITE_URL.toString(),
    image: new URL("/opengraph-image.jpg", SITE_URL).toString(),
    servesCuisine: ["Vegetarian", "Healthy food"],
    hasMenu: new URL("/menu", SITE_URL).toString(),
    ...(cafe.address && { address: cafe.address }),
    ...(cafe.phone && { telephone: cafe.phone }),
    ...(cafe.mapUrl && { hasMap: cafe.mapUrl }),
    sameAs: [cafe.instagram && `https://instagram.com/${cafe.instagram}`].filter(Boolean),
  };
  return (
    <script
      type="application/ld+json"
      // escape "<" so menu text can never close the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
