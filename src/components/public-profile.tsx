import Link from "next/link";
import { MapPin, ShieldCheck, CalendarDays, Home } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { ProfileShareBar } from "@/components/ui/profile-share-bar";
import { Badge } from "@/components/ui/badge";

export interface PublicProfileOwner {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  profile: { bio: string | null; district: string | null } | null;
}

export interface PublicProfileListing {
  id: string;
  slug: string;
  title: string;
  price: number;
  negotiable: boolean;
  availabilityStatus: string;
  availabilityDate: Date | null;
  locationDistrict: string | null;
  locationSector: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: number | null;
  areaUnit: string | null;
  videoUrl: string | null;
  createdAt: Date;
  ownerId: string;
  marketplace: { name: string; displayName: string } | null;
  propertyType: { displayName: string } | null;
  images: { url: string; altText: string | null }[];
}

/**
 * The public agent profile.
 *
 * Shared by /agent/[slug] (the canonical, shareable URL) and /owners/[id],
 * which now redirects, so there is exactly one rendering of this page and the
 * two URLs can never drift apart.
 *
 * Contact details are deliberately absent. A client picks a listing and the
 * per-listing reveal flow hands over the number and WhatsApp link - keeping the
 * number off the profile stops one page from leaking an agent's whole portfolio
 * of contacts at once.
 */
export function PublicProfile({
  owner,
  listings,
  verified,
  membershipName,
  slug,
}: {
  owner: PublicProfileOwner;
  listings: PublicProfileListing[];
  verified: boolean;
  membershipName: string | null;
  slug: string | null;
}) {
  const initials = `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();
  const fullName = `${owner.firstName} ${owner.lastName}`.trim();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
              {verified && membershipName && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified · {membershipName}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Home className="h-4 w-4" /> {owner.role === "COMMISSIONAIRE" ? "Commissionaire" : "Owner"}
              </span>
              {owner.profile?.district && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {owner.profile.district}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> On Igura since{" "}
                {new Date(owner.createdAt).toLocaleDateString("en-RW", { month: "short", year: "numeric" })}
              </span>
            </div>
            {owner.profile?.bio && <p className="mt-3 text-sm text-slate-600 max-w-2xl">{owner.profile.bio}</p>}
          </div>
          <div className="flex sm:flex-col gap-2">
            <Badge variant="default">{listings.length} live {listings.length === 1 ? "listing" : "listings"}</Badge>
          </div>
        </div>

        {/* The whole point of the profile: one link the agent pastes into a
            WhatsApp status or a Facebook post. */}
        {slug && <ProfileShareBar slug={slug} name={fullName} />}

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">Listings by {owner.firstName}</h2>
        {listings.length === 0 ? (
          /* A brand-new agent should not look broken. Reuses the launch framing
              from the marketplace pages rather than a dead "no listings". */
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 px-6 py-10 text-center">
            <h3 className="text-lg font-bold text-slate-900">No live listings right now</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {owner.firstName} hasn&rsquo;t published a property on Igura yet. Check back soon, or ask them
              directly about what they have available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((p) => (
              <PropertyCard key={p.id} property={{ ...p, verifiedOwner: verified } as any} />
            ))}
          </div>
        )}
        <p className="mt-8 text-xs text-slate-400">
          Contact details stay hidden until you reveal them on a listing.{" "}
          <Link href="/help" className="underline">How revealing works</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
