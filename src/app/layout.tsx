import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { I18nProvider } from "@/i18n";

// Self-hosted at build time. The previous setup pulled the family from Google
// through a render-blocking `@import` in globals.css plus two preconnects,
// which put an extra DNS+TLS round trip in front of first paint and shipped six
// weights nobody used. next/font removes the external request entirely and
// only emits the weights the design actually renders.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
});

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
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-screen bg-slate-50 antialiased">
        <I18nProvider>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
