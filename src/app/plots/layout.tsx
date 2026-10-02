import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plots & Land for Sale in Rwanda",
  description:
    "Residential, commercial and agricultural plots for sale in Rwanda — Kimironko, Remera, Bugesera, Gitega and more. Verified sellers, clear prices in RWF.",
  keywords: [
    "plots for sale Rwanda", "land for sale Kigali", "residential plot Kimironko",
    "commercial plot Remera", "agricultural land Bugesera", "land titles Rwanda",
    "plot prices Rwanda", "buy land Gasabo",
  ],
  alternates: { canonical: "https://igura-rw.vercel.app/plots" },
  openGraph: {
    title: "Plots & Land for Sale in Rwanda",
    description:
      "Verified plot and land listings across Rwanda. Filter by location, price, area and plot type.",
    type: "website",
    url: "https://igura-rw.vercel.app/plots",
  },
};

export default function PlotsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
