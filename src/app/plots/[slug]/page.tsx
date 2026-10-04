import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Maximize, Phone, User, Eye, ArrowLeft, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { Badge } from "@/components/ui/badge";
import { ContactRevealCard } from "@/components/ui/contact-reveal-card";
import { TrustPanel } from "@/components/ui/trust-panel";
import { EstimatePanel } from "@/components/ui/estimate-panel";
import { ListingJsonLd } from "@/components/ui/listing-json-ld";
import { PropertyGallery } from "@/components/ui/property-gallery";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { en } from "@/i18n/en";
import { isPaymentsEnabled } from "@/lib/monetization";

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
  if (!property) return { title: "Plot Not Found" };
  const img = property.images[0]?.url;
  return {
    title: `${property.title} - Igura`,
    description: property.description?.slice(0, 160) || `Buy ${property.title} in ${property.locationSector || ""}, ${property.locationDistrict || "Kigali"} for ${formatPrice(property.price)}`,
    openGraph: {
      title: property.title,
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
          profile: { select: { avatarUrl: true, slug: true } },
        },
      },
    },
  });

  if (!property || property.status !== "ACTIVE") {
    notFound();
  }

  // Same 10-minute IP window as the API route — never double-count.
  try {
    const hdrs = await headers();
    const forwarded = hdrs.get("x-forwarded-for") || "";
    const ip = forwarded.split(",")[0].trim() || hdrs.get("x-real-ip") || "unknown";
    if (rateLimit(`view:${property.id}:${ip}`, 1, 10 * 60 * 1000).ok) {
      await prisma.property.update({
        where: { id: property.id },
        data: { viewCount: { increment: 1 } },
      });
      property.viewCount += 1;
    }
  } catch {
    // Counting must never break the page.
  }

  const ownerMembership = await prisma.membership.findFirst({
    where: { userId: property.ownerId, status: "ACTIVE" },
    select: { expiresAt: true },
  });
  const verifiedOwner =
    !!ownerMembership && (!ownerMembership.expiresAt || ownerMembership.expiresAt > new Date());

  const showCoords = property.coordinatesRevealed && property.latitude && property.longitude;
  const purposeFeature = property.features.find((f) => f.feature === "purpose");

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <ListingJsonLd
          title={property.title}
          description={property.description}
          url={`https://igura-rw.vercel.app/plots/${property.slug}`}
          image={property.images[0]?.url}
          price={property.price}
        />
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b625b] mb-6">
          <Link href="/plots" className="flex items-center gap-1 hover:text-[#047857] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("plots.title")}
          </Link>
          {property.locationDistrict && (
            <>
              <span className="text-[#d6ccbf]">/</span>
              <span>{property.locationDistrict}</span>
            </>
          )}
          <span className="text-[#d6ccbf]">/</span>
          <span className="text-[#1c1917] font-medium truncate">{property.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photography first: the gallery is the page's visual anchor, so the
                surrounding chrome stays quiet and solid. */}
            <PropertyGallery
              images={property.images.map((im: any) => ({ url: im.url, altText: im.altText }))}
              title={property.title}
              videoUrl={property.videoUrl}
              badge={property.propertyType?.displayName || "Plot"}
            />

            {/* Video */}
            {property.videoUrl && (
              <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
                <h2 className="text-lg font-semibold text-[#1c1917] mb-4">{t("detail.propertyVideo")}</h2>
                <video src={property.videoUrl} controls className="w-full aspect-video rounded-xl bg-black" />
              </div>
            )}

            {/* Title & Price */}
            <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-[#1c1917] leading-tight">{property.title}</h1>
                  <div className="flex items-center gap-2 mt-3">
                    {purposeFeature && <Badge variant="outline">{purposeFeature.value}</Badge>}
                    <Badge variant={property.negotiable ? "outline" : "default"}>
                      {property.negotiable ? t("detail.negotiable") : t("detail.fixedPrice")}
                    </Badge>
                    <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
                      {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold text-[#047857]">{formatPrice(property.price)}</div>
                  {property.negotiable && <div className="text-sm text-[#6b625b]">{t("detail.negotiable")}</div>}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-5 pt-5 border-t border-[#f2ede6] text-sm text-[#6b625b]">
                {property.areaValue != null && (
                  <span className="flex items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-[#fef3c7] flex items-center justify-center">
                      <Maximize className="h-4 w-4 text-[#b45309]" />
                    </div>
                    {property.areaValue} {property.areaUnit === "HECTARE" ? t("detail.hectares") : "m&sup2;"}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <div className="h-8 w-8 rounded-lg bg-[#f7f4ef] flex items-center justify-center">
                    <Eye className="h-4 w-4 text-[#6b625b]" />
                  </div>
                  {property.viewCount} {t("detail.views")}
                </span>
                {(property.locationDistrict || property.locationSector) && (
                  <span className="flex items-center gap-1.5">
                    <div className="h-8 w-8 rounded-lg bg-[#f7f4ef] flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-[#6b625b]" />
                    </div>
                    {[property.locationSector, property.locationDistrict].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
              <h2 className="text-lg font-semibold text-[#1c1917] mb-4">{t("detail.description")}</h2>
              <p className="text-[#6b625b] whitespace-pre-line leading-relaxed">{property.description}</p>
            </div>

            {/* Keywords */}
            {property.keywords.length > 0 && (
              <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
                <h2 className="text-lg font-semibold text-[#1c1917] mb-4">{t("detail.nearbyInfra")}</h2>
                <div className="flex flex-wrap gap-2">
                  {property.keywords.map((kw) => (
                    <span key={kw.id} className="px-3 py-1.5 rounded-full bg-[#fef3c7] text-amber-700 text-sm font-medium border border-amber-100">
                      {kw.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
              <h2 className="text-lg font-semibold text-[#1c1917] mb-4">{t("detail.location")}</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {property.locationVillage && (
                  <div className="bg-[#f7f4ef] rounded-lg px-3 py-2"><span className="text-[#6b625b]">{t("detail.village")}</span> <span className="font-medium text-[#1c1917]">{property.locationVillage}</span></div>
                )}
                {property.locationCell && (
                  <div className="bg-[#f7f4ef] rounded-lg px-3 py-2"><span className="text-[#6b625b]">{t("detail.cell")}</span> <span className="font-medium text-[#1c1917]">{property.locationCell}</span></div>
                )}
                {property.locationSector && (
                  <div className="bg-[#f7f4ef] rounded-lg px-3 py-2"><span className="text-[#6b625b]">{t("detail.sector")}</span> <span className="font-medium text-[#1c1917]">{property.locationSector}</span></div>
                )}
                {property.locationDistrict && (
                  <div className="bg-[#f7f4ef] rounded-lg px-3 py-2"><span className="text-[#6b625b]">{t("detail.district")}</span> <span className="font-medium text-[#1c1917]">{property.locationDistrict}</span></div>
                )}
              </div>
              {showCoords && (
                <div className="mt-4 h-64 bg-[#f2ede6] rounded-xl flex items-center justify-center text-[#6b625b] border border-[#e8e1d8]">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-[#a8a29e]" />
                    <p className="text-sm">Map at {property.latitude?.toFixed(4)}, {property.longitude?.toFixed(4)}</p>
                  </div>
                </div>
              )}
            </div>

            <TrustPanel
              verifiedOwner={verifiedOwner}
              coordsPublished={!!showCoords}
              listedAt={property.createdAt}
              ownerName={`${property.owner.firstName} ${property.owner.lastName}`}
              viewCount={property.viewCount}
            />
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
              ownerId={property.owner.id}
      ownerSlug={(property.owner as any).profile?.slug ?? null}
              ownerRole={t("detail.plotOwner")}
              accentColor="amber"
              paymentsEnabled={isPaymentsEnabled()}
            />

            <EstimatePanel
              marketplace={property.marketplace?.name || "Plot Selling VIP"}
              district={property.locationDistrict}
              sector={property.locationSector}
              propertyType={property.propertyType?.slug || property.propertyType?.displayName}
              bedrooms={property.bedrooms}
              exclude={property.id}
            />

            {/* Summary */}
            <div className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-6">
              <h3 className="font-semibold text-[#1c1917] mb-4">{t("detail.plotSummary")}</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#faf8f4]">
                  <dt className="text-[#6b625b]">{t("detail.type")}</dt>
                  <dd className="font-medium text-[#1c1917]">{property.propertyType?.displayName}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#faf8f4]">
                  <dt className="text-[#6b625b]">{t("detail.price")}</dt>
                  <dd className="font-bold text-[#047857]">{formatPrice(property.price)}</dd>
                </div>
                {property.areaValue != null && (
                  <div className="flex justify-between py-2 border-b border-[#faf8f4]">
                    <dt className="text-[#6b625b]">{t("detail.area")}</dt>
                    <dd className="font-medium text-[#1c1917]">{property.areaValue} {property.areaUnit === "HECTARE" ? "ha" : "m&sup2;"}</dd>
                  </div>
                )}
                {purposeFeature && (
                  <div className="flex justify-between py-2 border-b border-[#faf8f4]">
                    <dt className="text-[#6b625b]">{t("detail.purpose")}</dt>
                    <dd className="font-medium text-[#1c1917]">{purposeFeature.value}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <dt className="text-[#6b625b]">{t("detail.negotiable")}</dt>
                  <dd className="font-medium text-[#1c1917]">{property.negotiable ? t("detail.yes") : t("detail.no")}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
