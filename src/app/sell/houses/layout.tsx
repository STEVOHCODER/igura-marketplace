import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Houses for Sale in Kigali, Rwanda | Igura VVIP",
  description: "Browse verified houses for sale across Rwanda. Find homes in Kigali, Gasabo, Kicukiro, Nyarugenge and more with exclusive VVIP listings on Igura.",
  openGraph: {
    title: "Houses for Sale in Rwanda | Igura VVIP",
    description: "Browse exclusive verified houses for sale across Rwanda. Filter by location, price, and property type with VVIP access.",
    type: "website",
  },
};

export default function SellHousesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
