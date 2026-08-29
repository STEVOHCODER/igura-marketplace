import { PublicLayout } from "@/components/layout/public-layout";
import { Shield, MapPin, Users, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">About Igura</h1>
        <p className="text-lg text-slate-600 mb-8">
          Igura is Rwanda&apos;s trusted real estate marketplace, connecting property owners, agents, and clients across all 30 districts.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl"><Shield className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Verified Listings</h3>
              <p className="text-slate-600">Every property is reviewed by our team before going live.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl"><MapPin className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Nationwide Coverage</h3>
              <p className="text-slate-600">Listings from Kigali to every district in Rwanda.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-xl"><Users className="w-6 h-6 text-purple-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Trusted Community</h3>
              <p className="text-slate-600">Over 1,200 happy clients and growing.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 rounded-xl"><Heart className="w-6 h-6 text-rose-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Built for Rwanda</h3>
              <p className="text-slate-600">Designed specifically for the Rwandan real estate market.</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-slate-600">
            To make finding and listing property in Rwanda simple, transparent, and accessible to everyone. Whether you&apos;re looking for a house to rent in Kigali or a plot of land in Bugesera, Igura connects you with verified opportunities.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
