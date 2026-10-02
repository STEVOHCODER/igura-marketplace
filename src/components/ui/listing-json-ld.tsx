/** RealEstateListing structured data for search engines. Only facts from
 *  the row itself — no invented ratings, reviews or availability. */
export function ListingJsonLd({
  title,
  description,
  url,
  image,
  price,
  currency = "RWF",
}: {
  title: string;
  description?: string | null;
  url: string;
  image?: string | null;
  price: number;
  currency?: string;
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: title,
    description: (description || title).slice(0, 300),
    url,
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
