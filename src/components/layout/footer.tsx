import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">I</span>
              </div>
              <span className="text-xl font-bold text-white">Igura</span>
            </Link>
            <p className="text-sm text-slate-400">
              Rwanda&apos;s trusted real estate marketplace. Find your next home or list your property.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/rent/houses" className="hover:text-white transition-colors">Rent a House</Link></li>
              <li><Link href="/plots" className="hover:text-white transition-colors">Find a Plot</Link></li>
              <li><Link href="/register" className="hover:text-white transition-colors">List Your Property</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} Igura Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
