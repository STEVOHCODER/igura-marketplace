"use client";
import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { formatPrice } from "@/lib/utils";

/** Igura Value Estimate from live comparables. Degrades to nothing when
 *  fewer than 3 comps exist — never a fabricated number. */
export function EstimatePanel({
  marketplace,
  district,
  sector,
  propertyType,
  bedrooms,
  exclude,
}: {
  marketplace: string;
  district?: string | null;
  sector?: string | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  exclude?: string;
}) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams({ marketplace });
    if (district) params.set("district", district);
    if (sector) params.set("sector", sector);
    if (propertyType) params.set("propertyType", propertyType);
    if (bedrooms != null) params.set("bedrooms", String(bedrooms));
    if (exclude) params.set("exclude", exclude);
    fetch(`/api/estimate?${params.toString()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.available) setData(d); })
      .catch(() => {});
  }, [marketplace, district, sector, propertyType, bedrooms, exclude]);

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Scale className="h-4 w-4 text-violet-600" />
        <h3 className="font-semibold text-slate-900">Igura value estimate</h3>
      </div>
      <p className="text-2xl font-bold text-violet-700 mt-2">{formatPrice(data.estimate)}</p>
      <p className="text-xs text-slate-500 mt-1">
        Range {formatPrice(data.low)} – {formatPrice(data.high)} · {data.count} comparable listings
      </p>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{data.disclaimer}</p>
    </div>
  );
}
