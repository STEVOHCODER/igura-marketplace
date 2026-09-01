"use client";
import Link from "next/link";
import { MapPin, Home, Shield, Crown } from "lucide-react";
import { useI18n } from "@/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <svg className="h-8 w-auto" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="footerLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <rect x="2" y="4" width="40" height="40" rx="8" fill="url(#footerLogoGrad)" />
                <path d="M14 14 L14 34 L28 34" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="32" cy="14" r="3" fill="white" opacity="0.9" />
                <text x="50" y="33" fontFamily="Inter, system-ui, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff">Igura</text>
              </svg>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500">
              {t("footer.brandDesc")}
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>{t("footer.verifiedSecure")}</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("footer.marketplace")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/rent/houses" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-emerald-500" /> {t("footer.rentHouse")}
                </Link>
              </li>
              <li>
                <Link href="/plots" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" /> {t("footer.findPlot")}
                </Link>
              </li>
              <li>
                <Link href="/sell/houses" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-violet-500" /> {t("footer.sellHouse")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">{t("footer.listProperty")}</Link>
              </li>
              <li>
                <Link href="/dashboard/memberships" className="hover:text-white transition-colors">{t("footer.pricingPlans")}</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("footer.company")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">{t("footer.aboutUs")}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">{t("footer.howItWorks")}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t("footer.contact")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">{t("footer.support")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">{t("footer.helpCenter")}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t("footer.terms")}</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t("footer.privacy")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} {t("footer.copyright")}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("footer.allSystems")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
