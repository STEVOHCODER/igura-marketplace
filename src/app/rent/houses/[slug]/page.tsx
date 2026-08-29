import { notFound } from "next/navigation";
import { MapPin, Bed, Bath, Maximize, Phone, User, Tag, Calendar, Eye, Share2, Home } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HouseDetailPage({ params }: Props) {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      keywords: true,
      propertyType: true,
      marketplace: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          profile: { select: { avatarUrl: true, bio: true } },
        },
      },
    },
  });

  if (!property || property.status !== "ACTIVE") {
    notFound();
  }

  await prisma.property.update({
    where: { id: property.id },
    data: { viewCount: { increment: 1 } },
  });

  const showCoords = property.coordinatesRevealed && property.latitude && property.longitude;

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <a href="/rent/houses" className="hover:text-emerald-600">Houses for Rent</a>
          <span className="mx-2">/</span>
          {property.locationDistrict && (
            <>
              <span>{property.locationDistrict}</span>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-slate-900">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {property.images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl overflow-hidden">
                {property.images.map((img, i) => (
                  <div key={img.id} className={`relative ${i === 0 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                    <img
                      src={img.url}
                      alt={img.altText || property.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <Home className="h-16 w-16" />
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="success">{property.propertyType?.displayName}</Badge>
                    <Badge variant={property.negotiable ? "outline" : "default"}>
                      {property.negotiable ? "Negotiable" : "Fixed Price"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-600">{formatPrice(property.price)}</div>
                  <div className="text-sm text-slate-500">per month</div>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 text-sm text-slate-500">
                {(property.bedrooms != null || property.bathrooms != null) && (
                  <div className="flex items-center gap-4">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms} Beds</span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms} Baths</span>
                    )}
                  </div>
                )}
                {property.areaValue != null && (
                  <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{property.areaValue} m²</span>
                )}
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{property.viewCount} views</span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
                  {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
                </Badge>
                {(property.locationDistrict || property.locationSector) && (
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-4 w-4" />
                    {[property.locationSector, property.locationDistrict].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Description</h2>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>

            {property.keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Nearby Infrastructure</h2>
                <div className="flex flex-wrap gap-2">
                  {property.keywords.map((kw) => (
                    <span key={kw.id} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium">
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">Location</h2>
              <div className="space-y-1 text-sm text-slate-600">
                {property.locationVillage && <p>Village: {property.locationVillage}</p>}
                {property.locationCell && <p>Cell: {property.locationCell}</p>}
                {property.locationSector && <p>Sector: {property.locationSector}</p>}
                {property.locationDistrict && <p>District: {property.locationDistrict}</p>}
                {property.locationCountry && <p>Country: {property.locationCountry}</p>}
              </div>
              {showCoords ? (
                <div className="mt-4 h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                  Map would display at {property.latitude?.toFixed(4)}, {property.longitude?.toFixed(4)}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400 italic">Exact coordinates are hidden by the owner</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Commissionaire</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {property.owner.firstName} {property.owner.lastName}
                  </div>
                  <div className="text-sm text-slate-500">Property Owner</div>
                </div>
              </div>
              {property.contactPhone && (
                <a
                  href={`tel:${property.contactPhone}`}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Phone className="h-5 w-5" />
                  {property.contactPhone}
                </a>
              )}
              {property.contactName && (
                <p className="mt-3 text-sm text-slate-500 text-center">Ask for: {property.contactName}</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Property Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="font-medium">{property.propertyType?.displayName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Price</dt><dd className="font-medium text-emerald-600">{formatPrice(property.price)}/mo</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Negotiable</dt><dd className="font-medium">{property.negotiable ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Availability</dt><dd className="font-medium">{availabilityLabel(property.availabilityStatus, property.availabilityDate)}</dd></div>
                {property.bedrooms != null && <div className="flex justify-between"><dt className="text-slate-500">Bedrooms</dt><dd className="font-medium">{property.bedrooms}</dd></div>}
                {property.bathrooms != null && <div className="flex justify-between"><dt className="text-slate-500">Bathrooms</dt><dd className="font-medium">{property.bathrooms}</dd></div>}
                {property.areaValue != null && <div className="flex justify-between"><dt className="text-slate-500">Area</dt><dd className="font-medium">{property.areaValue} m²</dd></div>}
              </dl>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Report Listing</h3>
              <p className="text-sm text-slate-500 mb-3">Is this listing suspicious or inappropriate?</p>
              <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                Report this property
              </button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
