import Link from "next/link";
import { MapPin, Bed, Bath, Maximize } from "lucide-react";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { Badge } from "./badge";

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
  };
  marketplace?: string;
}

export function PropertyCard({ property, marketplace }: PropertyCardProps) {
  const isPlot = marketplace === "plot_sale" || marketplace === "Plot Selling VIP" || property.marketplace?.name === "Plot Selling VIP";
  const href = isPlot
    ? `/plots/${property.slug}`
    : `/rent/houses/${property.slug}`;

  return (
    <Link href={href} className="group">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0].url}
              alt={property.images[0].altText || property.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="success">{property.propertyType?.displayName || "Property"}</Badge>
            {property.negotiable && <Badge variant="outline">Negotiable</Badge>}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-1">
            {property.title}
          </h3>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{formatPrice(property.price)}<span className="text-sm font-normal text-slate-500">/month</span></p>
          {(property.locationDistrict || property.locationSector) && (
            <div className="mt-2 flex items-center text-sm text-slate-500">
              <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">{property.locationSector ? `${property.locationSector}, ` : ""}{property.locationDistrict}</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1"><Bed className="h-4 w-4" />{property.bedrooms}</span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1"><Bath className="h-4 w-4" />{property.bathrooms}</span>
            )}
            {property.areaValue != null && (
              <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{property.areaValue} {property.areaUnit === "SQM" ? "m²" : property.areaUnit === "HECTARE" ? "ha" : property.areaUnit}</span>
            )}
          </div>
          <div className="mt-2">
            <Badge variant={property.availabilityStatus === "AVAILABLE" ? "success" : property.availabilityStatus === "UNAVAILABLE" ? "danger" : "warning"}>
              {availabilityLabel(property.availabilityStatus, property.availabilityDate)}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}
