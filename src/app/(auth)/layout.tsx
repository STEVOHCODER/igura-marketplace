import type { Metadata } from "next";
import Link from "next/link";
import { Home, MapPin, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: {
    template: "%s | Igura",
    default: "Login - Igura",
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Visual Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <svg className="h-8 w-auto" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="authLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect x="2" y="4" width="40" height="40" rx="8" fill="url(#authLogoGrad)" />
              <path d="M14 14 L14 34 L28 34" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="14" r="3" fill="white" opacity="0.9" />
              <text x="50" y="33" fontFamily="Inter, system-ui, sans-serif" fontSize="26" fontWeight="700" fill="#ffffff">Igura</text>
            </svg>
          </Link>

          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white leading-tight">
              Rwanda&apos;s most trusted
              <br />
              real estate marketplace
            </h2>
            <div className="space-y-4">
              {[
                { icon: Home, text: "Find houses for rent across 30 districts" },
                { icon: MapPin, text: "Discover plots and land for sale" },
                { icon: Shield, text: "Every listing verified and secure" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Igura Marketplace. All rights reserved.</p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-4 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
