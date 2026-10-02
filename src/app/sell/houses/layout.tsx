import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Houses for Sale in Kigali, Rwanda",
  description:
    "Premium houses for sale in Rwanda — villas in Nyarutarama, apartments in Kimihurura, townhouses in Kagugu, duplexes in Kibagabaga, bungalows in Kabuga. VVIP verified listings.",
  keywords: [
    "houses for sale Kigali", "villas for sale Nyarutarama", "apartments for sale Kimihurura",
    "townhouse Kagugu", "duplex Kibagabaga", "bungalow Kabuga", "buy house Rwanda",
    "VVIP houses Rwanda",
  ],
  alternates: { canonical: "https://igura-rw.vercel.app/sell/houses" },
  openGraph: {
    title: "Houses for Sale in Rwanda",
    description:
      "Exclusive verified houses for sale across Rwanda. Filter by location, price and property type.",
    type: "website",
    url: "https://igura-rw.vercel.app/sell/houses",
  },
};

export default function SellHousesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
