import Link from "next/link";
import { MapPin, Bed, Bath, Maximize, PlayCircle, ShieldCheck } from "lucide-react";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { Badge } from "./badge";
import { FavoriteButton } from "./favorite-button";
import { CompareButton } from "./compare-button";
import { CoverImage } from "./cover-image";

interface PropertyCardProps {
  property: {
    id: string;
    slug: string;
    title: string;
    price: number;
    negotiable: boolean;
    availabilityStatus: string;
    availabilityDate?: string | null;
    locationDistrict?: string | null;
    locationSector?: string | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    areaValue?: number | null;
    areaUnit?: string | null;
    marketplace?: { name: string; displayName: string };
    propertyType?: { displayName: string } | null;
    images?: { url: string; altText?: string | null }[];
    videoUrl?: string | null;
    verifiedOwner?: boolean;
    createdAt?: string | Date | null;
  };
  marketplace?: string;
  initialSaved?: boolean;
  onToggleFavorite?: (propertyId: string, saved: boolean) => void;
}

function timeAgo(value?: string | Date | null): string | null {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function PropertyCard({ property, marketplace, initialSaved, onToggleFavorite }: PropertyCardProps) {
  const marketName = marketplace || property.marketplace?.name || "";
  const isPlot = marketName === "plot_sale" || marketName === "Plot Selling VIP";
  const isSale = marketName === "House Selling VVIP" || isPlot;
  const href = isPlot
    ? `/plots/${property.slug}`
    : marketName === "House Selling VVIP"
      ? `/sell/houses/${property.slug}`
      : `/rent/houses/${property.slug}`;
  const ago = timeAgo(property.createdAt);

  // A stored URL can still be undecodable or already purged from the bucket.
  // CoverImage swaps in a placeholder on error, so a dead link never paints
  // browser alt text across the badges.
  const coverUrl = property.images?.[0]?.url;

  return (
    <Link href={href} className="group block h-full">
      {/* Solid, not glass: this card is scanned for price, bedrooms, location
          and verification. Translucency over a photograph makes exactly that
          information slower to read, so the imagery stays opaque and only the
          small floating controls on top of it use a light scrim. */}
      <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-[#e8e1d8] bg-[#fffdfb] shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition-all duration-200 group-hover:-translate-y-1 group-hover:border-[#d6ccbf] group-hover:shadow-[0_12px_28px_-8px_rgba(28,25,23,0.14)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f2ede6]">
          {coverUrl ? (
            <CoverImage
              src={coverUrl}
              alt={property.images![0].altText || property.title}
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#d6ccbf]">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21"
                />
              </svg>
            </div>
          )}

          {/* A soft scrim keeps the small badges legible over any photo without
              making the whole card transparent. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge variant="success">{property.propertyType?.displayName || "Property"}</Badge>
            {property.negotiable && <Badge variant="outline">Negotiable</Badge>}
          </div>

          <div className="absolute right-3 top-3 flex gap-1.5">
            <FavoriteButton
              propertyId={property.id}
              initialSaved={initialSaved}
              {...(onToggleFavorite
                ? { onToggle: (saved: boolean) => onToggleFavorite(property.id, saved) }
                : {})}
            />
            <CompareButton propertyId={property.id} />
          </div>

          {/* Price sits on the photo, the way a shop window does: the single
              number people scan for, with no competing chrome around it. */}
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-baseline gap-1 rounded-xl bg-white/95 px-2.5 py-1.5 text-[#065f46] shadow-[0_4px_12px_-2px_rgba(28,25,23,0.3)]">
              <span className="text-lg font-extrabold leading-none">{formatPrice(property.price)}</span>
              {!isSale && <span className="text-[11px] font-medium text-[#6b625b]">/mo</span>}
            </span>
          </div>

          {property.videoUrl && (
            <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
              <PlayCircle className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 font-semibold text-[#1c1917] transition-colors group-hover:text-[#047857]">
            {property.title}
          </h3>

          {(property.locationDistrict || property.locationSector) && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-[#6b625b]">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-[#b45309]" />
              <span className="truncate">
                {property.locationSector ? `${property.locationSector}, ` : ""}
                {property.locationDistrict}
              </span>
            </div>
          )}

          {/* Facts in one scannable row: beds, baths, size. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] text-[#6b625b]">
            {property.bedrooms != null && property.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}
              </span>
            )}
            {property.bathrooms != null && (
              <span className="inline-flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                {property.bathrooms} bath{property.bathrooms === 1 ? "" : "s"}
              </span>
            )}
            {property.areaValue != null && (
              <span className="inline-flex items-center gap-1">
                <Maximize className="h-3.5 w-3.5" />
                {property.areaValue}{" "}
                {property.areaUnit === "SQM" ? "m²" : property.areaUnit === "HECTARE" ? "ha" : property.areaUnit}
              </span>
            )}
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-3.5">
            <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
              {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
            </Badge>
            {property.verifiedOwner && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-[#047857]">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            )}
            {ago && <span className="ml-auto text-[11px] text-[#6b625b]">{ago}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
