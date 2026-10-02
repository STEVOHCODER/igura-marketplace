import type { Metadata } from "next";

const RWANDA_KEYWORDS = [
  "houses for rent Kigali", "apartments for rent Rwanda", "rooms for rent Kicukiro",
  "house rental Gasabo", "Nyarugenge rentals", "Remera apartments", "Kimironko houses",
  "Kacyiru townhouses", "Gacuriro rentals", "Nyabugogo studios", "Kanombe duplex",
  "Rwanda real estate", "verified listings Rwanda",
];

export const metadata: Metadata = {
  title: "Houses for Rent in Kigali, Rwanda",
  description:
    "Houses, apartments, rooms and studios for rent across Rwanda — Kigali City, Gasabo, Kicukiro, Nyarugenge, Remera, Kimironko, Kacyiru, Gacuriro, Nyabugogo and Kanombe. Verified owners, MoMo-ready contact reveal.",
  keywords: RWANDA_KEYWORDS,
  alternates: { canonical: "https://igura-rw.vercel.app/rent/houses" },
  openGraph: {
    title: "Houses for Rent in Rwanda",
    description:
      "Verified house and apartment rentals across Rwanda. Filter by location, price, bedrooms and property type.",
    type: "website",
    url: "https://igura-rw.vercel.app/rent/houses",
  },
};

export default function HousesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
