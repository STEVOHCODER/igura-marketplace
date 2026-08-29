import Link from "next/link";
import { Home, MapPin, Shield, Users, ArrowRight, Search, Star, CheckCircle, ChevronRight, Building2, TrendingUp, Heart } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";

const stats = [
  { value: "2,500+", label: "Active Listings", icon: Building2 },
  { value: "30", label: "Districts Covered", icon: MapPin },
  { value: "1,200+", label: "Happy Clients", icon: Heart },
  { value: "100%", label: "Verified Owners", icon: Shield },
];

const testimonials = [
  { name: "Alice Mukamana", role: "Tenant, Kigali", content: "Found my perfect apartment in Remera within a week. The verification process gave me confidence that the listing was real.", rating: 5 },
  { name: "Jean-Pierre Habimana", role: "Property Owner", content: "Listed my house and got 15 inquiries in the first day. Igura makes it easy to connect with serious renters.", rating: 5 },
  { name: "Grace Uwimana", role: "Land Buyer", content: "Bought a residential plot in Bugesera through Igura. The process was transparent and secure from start to finish.", rating: 5 },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-emerald-300">Rwanda&apos;s Most Trusted Platform</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
                Find a place<br />to call <span className="text-emerald-400">home.</span><br />
                <span className="text-emerald-400">Find land</span> for your future.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-lg leading-relaxed">
                Search houses for rent, discover plots for sale, and connect with verified property owners across Rwanda.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link href="/rent/houses" className="group inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-7 py-4 rounded-xl text-base font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-500/30 hover:-translate-y-0.5">
                  <Search className="h-5 w-5" />Find a House
                  <ChevronRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
                <Link href="/plots" className="group inline-flex items-center justify-center gap-2 bg-white/10 text-white px-7 py-4 rounded-xl text-base font-semibold hover:bg-white/15 transition-all border border-white/15 hover:border-white/25 hover:-translate-y-0.5">
                  <MapPin className="h-5 w-5" />Find a Plot
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-slate-400">
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /><span>Free to browse</span></div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /><span>Verified owners</span></div>
                <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /><span>Secure payments</span></div>
              </div>
            </div>
            <div className="hidden lg:block animate-fade-in-up delay-200">
              <div className="relative">
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="h-20 w-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                        <Home className="h-10 w-10 text-emerald-400" />
                      </div>
                      <p className="text-white/60 text-sm">Your perfect property awaits</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-4 shadow-xl animate-slide-in-right delay-300">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
                    <div><p className="text-2xl font-bold text-slate-900">2,500+</p><p className="text-xs text-slate-500">Active listings</p></div>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 bg-white rounded-2xl p-4 shadow-xl animate-slide-in-right delay-400">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (<Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />))}
                  </div>
                  <p className="text-sm font-medium text-slate-900">4.9/5 rating</p>
                  <p className="text-xs text-slate-500">from 800+ reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="inline-flex h-10 w-10 rounded-xl bg-emerald-50 items-center justify-center mb-3">
                    <stat.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-emerald-600 tracking-wide uppercase">Simple Process</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How Igura Works</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Three simple steps to find your next home or list your property</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { step: "01", icon: Users, title: "Create Account", desc: "Sign up in seconds and choose your role as client or commissionaire." },
              { step: "02", icon: Search, title: "Search & Discover", desc: "Browse thousands of verified listings with powerful filters." },
              { step: "03", icon: Home, title: "Connect & Move", desc: "Contact property owners directly and secure your perfect place." },
            ].map((item, i) => (
              <div key={item.step} className="relative group">
                <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50/30 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
                      <item.icon className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <span className="text-4xl font-extrabold text-slate-200 group-hover:text-emerald-200 transition-colors">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && <div className="hidden md:block absolute top-1/2 -right-6 lg:-right-8 w-6 lg:w-8 h-0.5 bg-slate-200" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketplaces */}
      <section className="py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-emerald-600 tracking-wide uppercase">Two Marketplaces</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">One Platform, Every Need</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">Whether you need a home to rent or land to build on, we&apos;ve got you covered</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/rent/houses" className="group">
              <div className="relative bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors duration-300">
                    <Home className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">House Rental</h3>
                  <p className="text-slate-500 leading-relaxed mb-6">Find rooms, apartments, and houses for rent across Rwanda. From single rooms to family homes.</p>
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold group-hover:gap-3 transition-all">Browse houses <ArrowRight className="h-5 w-5" /></div>
                </div>
              </div>
            </Link>
            <Link href="/plots" className="group">
              <div className="relative bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 hover:border-amber-300 hover:shadow-2xl hover:shadow-amber-100/50 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors duration-300">
                    <MapPin className="h-7 w-7 text-amber-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Plot Selling <span className="text-sm font-semibold text-amber-600 ml-2 bg-amber-50 px-2 py-0.5 rounded-full">VIP</span></h3>
                  <p className="text-slate-500 leading-relaxed mb-6">Discover residential, commercial, and farming plots for sale. Invest in Rwanda&apos;s growth.</p>
                  <div className="flex items-center gap-2 text-amber-600 font-semibold group-hover:gap-3 transition-all">Browse plots <ArrowRight className="h-5 w-5" /></div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-emerald-600 tracking-wide uppercase">Testimonials</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Loved by Rwandans</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">See what our users have to say about their experience with Igura</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => (<Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />))}
                </div>
                <p className="text-slate-600 leading-relaxed mb-6">&ldquo;{t.content}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-emerald-700">{t.name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t.name}</p>
                    <p className="text-sm text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-emerald-100 max-w-xl mx-auto">Join thousands of Rwandans who trust Igura to find their next home or investment property.</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 px-8 py-4 rounded-xl text-base font-semibold hover:bg-emerald-50 transition-all shadow-lg hover:-translate-y-0.5">
              Create Free Account <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/rent/houses" className="inline-flex items-center justify-center gap-2 bg-emerald-500/30 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-emerald-500/40 transition-all border border-emerald-400/30">
              Browse Listings
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
