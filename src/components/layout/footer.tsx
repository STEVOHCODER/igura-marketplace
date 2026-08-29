import Link from "next/link";
import { MapPin, Home, Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
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
              Rwanda&apos;s trusted real estate marketplace. Find your next home or list your property with confidence.
            </p>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Verified &amp; Secure</span>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Marketplace</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/rent/houses" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-emerald-500" /> Rent a House
                </Link>
              </li>
              <li>
                <Link href="/plots" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" /> Find a Plot
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">List Your Property</Link>
              </li>
              <li>
                <Link href="/dashboard/memberships" className="hover:text-white transition-colors">Pricing Plans</Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Igura Marketplace. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
