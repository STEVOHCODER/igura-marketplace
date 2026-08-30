import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plots & Land for Sale in Rwanda | Igura",
  description: "Browse plots and land for sale in Rwanda. Find agricultural, residential, and commercial plots in Kigali, Gasabo, Bugesera and more on Igura.",
  openGraph: {
    title: "Plots & Land for Sale in Rwanda | Igura",
    description: "Browse verified plots and land listings across Rwanda. Filter by location, price, area, and plot type.",
    type: "website",
  },
};

export default function PlotsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
