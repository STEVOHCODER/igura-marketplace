import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Maximize, Phone, User, Eye, ArrowLeft, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
    select: { title: true, description: true, price: true, locationDistrict: true, locationSector: true, images: { select: { url: true }, take: 1 } },
  });
  if (!property) return { title: "Plot Not Found" };
  const img = property.images[0]?.url;
  return {
    title: `${property.title} - Igura`,
    description: property.description?.slice(0, 160) || `Buy ${property.title} in ${property.locationSector || ""}, ${property.locationDistrict || "Kigali"} for ${formatPrice(property.price)}`,
    openGraph: {
      title: `${property.title} | Igura`,
      description: property.description?.slice(0, 200) || `Buy ${property.title} for ${formatPrice(property.price)}`,
      images: img ? [{ url: img, width: 800, height: 600 }] : [],
      type: "website",
    },
  };
}

export default async function PlotDetailPage({ params }: Props) {
  const { slug } = await params;

  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      keywords: true,
      features: true,
      propertyType: true,
      marketplace: true,
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          profile: { select: { avatarUrl: true } },
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
  const purposeFeature = property.features.find((f) => f.feature === "purpose");

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/plots" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Plots for Sale
          </Link>
          {property.locationDistrict && (
            <>
              <span className="text-slate-300">/</span>
              <span>{property.locationDistrict}</span>
            </>
          )}
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-medium truncate">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {property.images.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-2xl overflow-hidden bg-slate-100">
                {property.images.map((img, i) => (
                  <div key={img.id} className={`relative ${i === 0 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
                    <img src={img.url} alt={img.altText || property.title} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="warning" className="shadow-lg">{property.propertyType?.displayName || "Plot"}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MapPin className="h-16 w-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-400">No images available</p>
                </div>
              </div>
            )}

            {/* Title & Price */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">{property.title}</h1>
                  <div className="flex items-center gap-2 mt-3">
                    {purposeFeature && <Badge variant="outline">{purposeFeature.value}</Badge>}
                    <Badge variant={property.negotiable ? "outline" : "default"}>
                      {property.negotiable ? "Negotiable" : "Fixed Price"}
                    </Badge>
                    <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
                      {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold text-emerald-600">{formatPrice(property.price)}</div>
                  {property.negotiable && <div className="text-sm text-slate-500">Negotiable</div>}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-5 border-t border-slate-100 text-sm text-slate-600">
                {property.areaValue != null && (
                  <span className="flex items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Maximize className="h-4 w-4 text-amber-600" />
                    </div>
                    {property.areaValue} {property.areaUnit === "HECTARE" ? "hectares" : "m&sup2;"}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-slate-500" />
                  </div>
                  {property.viewCount} views
                </span>
                {(property.locationDistrict || property.locationSector) && (
                  <span className="flex items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-slate-500" />
                    </div>
                    {[property.locationSector, property.locationDistrict].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Description</h2>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>

            {/* Keywords */}
            {property.keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Nearby Infrastructure</h2>
                <div className="flex flex-wrap gap-2">
                  {property.keywords.map((kw) => (
                    <span key={kw.id} className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium border border-amber-100">
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Location</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.locationVillage && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Village:</span> <span className="font-medium text-slate-900">{property.locationVillage}</span></div>
                )}
                {property.locationCell && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Cell:</span> <span className="font-medium text-slate-900">{property.locationCell}</span></div>
                )}
                {property.locationSector && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Sector:</span> <span className="font-medium text-slate-900">{property.locationSector}</span></div>
                )}
                {property.locationDistrict && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">District:</span> <span className="font-medium text-slate-900">{property.locationDistrict}</span></div>
                )}
              </div>
              {showCoords && (
                <div className="mt-4 h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">Map at {property.latitude?.toFixed(4)}, {property.longitude?.toFixed(4)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Owner</h2>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-200">
                  <span className="text-sm font-bold text-white">
                    {property.owner.firstName[0]}{property.owner.lastName[0]}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">
                    {property.owner.firstName} {property.owner.lastName}
                  </div>
                  <div className="text-sm text-slate-500">Plot Owner</div>
                </div>
              </div>
              {property.contactPhone && (
                <a
                  href={`tel:${property.contactPhone}`}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white py-3.5 rounded-xl font-semibold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
                >
                  <Phone className="h-5 w-5" />
                  Call {property.contactPhone}
                </a>
              )}
              <div className="flex gap-2 mt-4">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Heart className="h-4 w-4" /> Save
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <Share2 className="h-4 w-4" /> Share
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Plot Summary</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-medium text-slate-900">{property.propertyType?.displayName}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">Price</dt>
                  <dd className="font-bold text-emerald-600">{formatPrice(property.price)}</dd>
                </div>
                {property.areaValue != null && (
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <dt className="text-slate-500">Area</dt>
                    <dd className="font-medium text-slate-900">{property.areaValue} {property.areaUnit === "HECTARE" ? "ha" : "m&sup2;"}</dd>
                  </div>
                )}
                {purposeFeature && (
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <dt className="text-slate-500">Purpose</dt>
                    <dd className="font-medium text-slate-900">{purposeFeature.value}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Negotiable</dt>
                  <dd className="font-medium text-slate-900">{property.negotiable ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
