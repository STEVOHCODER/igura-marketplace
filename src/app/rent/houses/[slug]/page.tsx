import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, Bed, Bath, Maximize, Phone, User, Eye, Share2, Home, Heart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { ContactRevealCard } from "@/components/ui/contact-reveal-card";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { en } from "@/i18n/en";

const t = (key: string) => en[key as keyof typeof en] || key;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = await prisma.property.findUnique({
    where: { slug },
    select: { title: true, description: true, price: true, locationDistrict: true, locationSector: true, images: { select: { url: true }, take: 1 } },
  });
  if (!property) return { title: "Property Not Found" };
  const img = property.images[0]?.url;
  return {
    title: `${property.title} - Igura`,
    description: property.description?.slice(0, 160) || `Rent ${property.title} in ${property.locationSector || ""}, ${property.locationDistrict || "Kigali"} for ${formatPrice(property.price)}/month`,
    openGraph: {
      title: `${property.title} | Igura`,
      description: property.description?.slice(0, 200) || `Rent ${property.title} for ${formatPrice(property.price)}/month`,
      images: img ? [{ url: img, width: 800, height: 600 }] : [],
      type: "website",
    },
  };
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/rent/houses" className="flex items-center gap-1 hover:text-emerald-600 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("houses.title")}
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
                    <img
                      src={img.url}
                      alt={img.altText || property.title}
                      className="w-full h-full object-cover"
                    />
                    {i === 0 && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="success" className="shadow-lg">{property.propertyType?.displayName}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-[16/9] bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Home className="h-16 w-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm text-slate-400">{t("detail.noImages")}</p>
                </div>
              </div>
            )}

            {/* Title & Price */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">{property.title}</h1>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={property.negotiable ? "outline" : "default"}>
                      {property.negotiable ? t("detail.negotiable") : t("detail.fixedPrice")}
                    </Badge>
                    <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
                      {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold text-emerald-600">{formatPrice(property.price)}</div>
                  <div className="text-sm text-slate-500">{t("detail.month")}</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-5 border-t border-slate-100 text-sm text-slate-600">
                {(property.bedrooms != null || property.bathrooms != null) && (
                  <div className="flex items-center gap-4">
                    {property.bedrooms != null && (
                      <span className="flex items-center gap-1.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Bed className="h-4 w-4 text-emerald-600" />
                        </div>
                        {property.bedrooms} {t("detail.beds")}
                      </span>
                    )}
                    {property.bathrooms != null && (
                      <span className="flex items-center gap-1.5">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <Bath className="h-4 w-4 text-emerald-600" />
                        </div>
                        {property.bathrooms} {t("detail.baths")}
                      </span>
                    )}
                  </div>
                )}
                {property.areaValue != null && (
                  <span className="flex items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Maximize className="h-4 w-4 text-emerald-600" />
                    </div>
                    {property.areaValue} m&sup2;
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-slate-500" />
                  </div>
                  {property.viewCount} {t("detail.views")}
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
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("detail.description")}</h2>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>

            {/* Keywords */}
            {property.keywords.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("detail.nearbyInfra")}</h2>
                <div className="flex flex-wrap gap-2">
                  {property.keywords.map((kw) => (
                    <span key={kw.id} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100">
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("detail.location")}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.locationVillage && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{t("detail.village")}</span> <span className="font-medium text-slate-900">{property.locationVillage}</span></div>
                )}
                {property.locationCell && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{t("detail.cell")}</span> <span className="font-medium text-slate-900">{property.locationCell}</span></div>
                )}
                {property.locationSector && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{t("detail.sector")}</span> <span className="font-medium text-slate-900">{property.locationSector}</span></div>
                )}
                {property.locationDistrict && (
                  <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">{t("detail.district")}</span> <span className="font-medium text-slate-900">{property.locationDistrict}</span></div>
                )}
              </div>
              {showCoords ? (
                <div className="mt-4 h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">Map at {property.latitude?.toFixed(4)}, {property.longitude?.toFixed(4)}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400 italic">{t("detail.hiddenCoords")}</p>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <ContactRevealCard
              propertyId={property.id}
              contactPhone={property.contactPhone}
              contactName={property.contactName}
              contactRevealed={(property as any).contactRevealed}
              ownerInitials={`${property.owner.firstName[0]}${property.owner.lastName[0]}`}
              ownerName={`${property.owner.firstName} ${property.owner.lastName}`}
              ownerRole={t("detail.propertyOwner")}
              accentColor="emerald"
            />

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">{t("detail.propertySummary")}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">{t("detail.type")}</dt>
                  <dd className="font-medium text-slate-900">{property.propertyType?.displayName}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">{t("detail.price")}</dt>
                  <dd className="font-bold text-emerald-600">{formatPrice(property.price)}{t("detail.mo")}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">{t("detail.negotiable")}</dt>
                  <dd className="font-medium text-slate-900">{property.negotiable ? t("detail.yes") : t("detail.no")}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50">
                  <dt className="text-slate-500">{t("detail.availability")}</dt>
                  <dd className="font-medium text-slate-900">{availabilityLabel(property.availabilityStatus, property.availabilityDate)}</dd>
                </div>
                {property.bedrooms != null && (
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <dt className="text-slate-500">{t("detail.bedrooms")}</dt>
                    <dd className="font-medium text-slate-900">{property.bedrooms}</dd>
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <dt className="text-slate-500">{t("detail.bathrooms")}</dt>
                    <dd className="font-medium text-slate-900">{property.bathrooms}</dd>
                  </div>
                )}
                {property.areaValue != null && (
                  <div className="flex justify-between py-2">
                    <dt className="text-slate-500">{t("detail.area")}</dt>
                    <dd className="font-medium text-slate-900">{property.areaValue} m&sup2;</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Report */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-2">{t("detail.reportListing")}</h3>
              <p className="text-sm text-slate-500 mb-3">{t("detail.reportDesc")}</p>
              <button className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors">
                {t("detail.reportBtn")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
