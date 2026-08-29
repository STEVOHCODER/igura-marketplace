import Link from "next/link";
import { Home, MapPin, Shield, Users, ArrowRight, Search, Star, Clock } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Find a place to live.
              <br />
              <span className="text-emerald-400">Find land for your future.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl">
              Rwanda&apos;s trusted real estate marketplace. Search houses for rent, discover plots for sale,
              and connect with verified property owners across the country.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/rent/houses"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Search className="h-5 w-5" />
                Find a House
              </Link>
              <Link
                href="/plots"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-white/20 transition-colors border border-white/20"
              >
                <MapPin className="h-5 w-5" />
                Find a Plot
              </Link>
            </div>
            <div className="mt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
              >
                Are you a property owner? List your property
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">How It Works</h2>
            <p className="mt-3 text-lg text-slate-500">Simple steps to find your next home or list your property</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">1. Create Account</h3>
              <p className="mt-2 text-slate-500">Sign up and choose your marketplace role as a client or commissionaire.</p>
            </div>
            <div className="text-center p-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">2. Search & Discover</h3>
              <p className="mt-2 text-slate-500">Browse properties with powerful filters. Find exactly what matches your needs.</p>
            </div>
            <div className="text-center p-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <Home className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">3. Connect & Move</h3>
              <p className="mt-2 text-slate-500">Contact property owners directly. Schedule visits and find your perfect place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplaces */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">Two Marketplaces, One Platform</h2>
            <p className="mt-3 text-lg text-slate-500">Whether you need a home or land, we&apos;ve got you covered</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/rent/houses" className="group">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4 group-hover:bg-emerald-600 transition-colors">
                  <Home className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">House Rental</h3>
                <p className="mt-2 text-slate-500">Find rooms, apartments, and houses for rent across Rwanda. From single rooms to family homes.</p>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 font-medium">
                  Browse houses <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
            <Link href="/plots" className="group">
              <div className="bg-white rounded-2xl p-8 border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4 group-hover:bg-amber-600 transition-colors">
                  <MapPin className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Plot Selling <span className="text-sm font-normal text-amber-600 ml-1">VIP</span></h3>
                <p className="mt-2 text-slate-500">Discover residential, commercial, and farming plots for sale. Invest in Rwanda&apos;s growth.</p>
                <div className="mt-4 flex items-center gap-2 text-amber-600 font-medium">
                  Browse plots <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-emerald-600">Trusted</div>
              <div className="text-sm text-slate-500 mt-1">Verified Listings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">Rwanda</div>
              <div className="text-sm text-slate-500 mt-1">All Districts</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">Secure</div>
              <div className="text-sm text-slate-500 mt-1">Real Payments</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-600">24/7</div>
              <div className="text-sm text-slate-500 mt-1">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-3 text-lg text-emerald-100">Join Igura today and find your perfect property in Rwanda.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-emerald-600 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-50 transition-colors"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
