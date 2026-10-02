import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, ShieldCheck, CalendarDays, Home } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

/** Public owner profile: identity, tenure, live listings, verification.
 *  Only ever reads public rows — no contact details, no stats invented. */
export default async function OwnerPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();

  const owner = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      profile: { select: { bio: true, district: true } },
    },
  });
  if (!owner) notFound();

  const [listings, membership] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: id, status: "ACTIVE" },
      select: {
        id: true, slug: true, title: true, price: true, negotiable: true,
        availabilityStatus: true, availabilityDate: true,
        locationDistrict: true, locationSector: true,
        bedrooms: true, bathrooms: true, areaValue: true, areaUnit: true,
        videoUrl: true, createdAt: true, ownerId: true,
        marketplace: { select: { name: true, displayName: true } },
        propertyType: { select: { displayName: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membership.findFirst({
      where: { userId: id, status: "ACTIVE" },
      select: { expiresAt: true, plan: { select: { displayName: true } } },
    }),
  ]);

  const verified = !!membership && (!membership.expiresAt || membership.expiresAt > new Date());
  const initials = `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                {owner.firstName} {owner.lastName}
              </h1>
              {verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified · {membership?.plan.displayName}
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

        <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">
          Listings by {owner.firstName}
        </h2>
        {listings.length === 0 ? (
          <p className="text-slate-500">No live listings right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((p: any) => (
              <PropertyCard key={p.id} property={{ ...p, verifiedOwner: verified }} />
            ))}
          </div>
        )}
        <p className="mt-8 text-xs text-slate-400">
          Contact details stay hidden until you reveal them on a listing. <Link href="/help" className="underline">How revealing works</Link>
        </p>
      </div>
    </PublicLayout>
  );
}
