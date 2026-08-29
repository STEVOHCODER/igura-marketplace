import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "Igura - Real Estate Marketplace Rwanda",
    template: "%s | Igura",
  },
  description:
    "Find houses for rent and plots for sale in Rwanda. Trusted real estate marketplace with verified listings.",
  keywords: ["real estate", "Rwanda", "house rental", "plot sale", "Kigali", "property"],
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_RW",
    siteName: "Igura",
    title: "Igura - Real Estate Marketplace Rwanda",
    description: "Find houses for rent and plots for sale in Rwanda.",
    images: [
      {
        url: "/logo.svg",
        width: 200,
        height: 48,
        alt: "Igura Logo",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
