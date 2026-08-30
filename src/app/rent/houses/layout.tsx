import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Houses for Rent in Kigali, Rwanda",
  description: "Browse houses and apartments for rent across Rwanda. Find homes in Kigali, Gasabo, Kicukiro, Nyarugenge and more with verified listings on Igura.",
  openGraph: {
    title: "Houses for Rent in Rwanda | Igura",
    description: "Browse verified house and apartment rentals across Rwanda. Filter by location, price, and property type.",
    type: "website",
  },
};

export default function HousesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
