"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X, MapPin } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { SaveSearchButton } from "@/components/ui/save-search-button";
import { CompareTray } from "@/components/ui/compare-tray";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
  import Link from "next/link";

const RWANDA_DISTRICTS = [
  "Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare",
  "Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera","Nyamasheke",
  "Rulindo","Burera","Gakenke","Ngoma","Kirehe","Gatsibo","Nyamagabe","Nyaruguru","Ruhango","Kamonyi"
];

export default function HouseSalePage() {
  const { t } = useI18n();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    district: "",
    sector: "",
    minPrice: "",
    maxPrice: "",
    availability: "",
    areaMin: "",
    areaMax: "",
    purpose: "",
    bedroomsMin: "",
    sort: "newest",
  });
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Deep links (homepage search, saved searches, shared URLs) arrive as
  // query params; adopt them once on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const patch: Record<string, string> = {};
    for (const k of ["q", "district", "sector", "minPrice", "maxPrice", "availability", "areaMin", "areaMax", "purpose", "bedroomsMin"]) {
      const v = sp.get(k);
      if (v) patch[k] = v;
    }
    if (Object.keys(patch).length > 0) setFilters((f) => ({ ...f, ...patch }));
    fetch("/api/favorites")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.favorites) setFavIds(new Set(d.favorites.map((f: any) => f.id)));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("marketplace", "House Selling VVIP");
      params.set("page", page.toString());
      params.set("limit", "12");
      if (filters.q) params.set("q", filters.q);
      if (filters.district) params.set("district", filters.district);
      if (filters.sector) params.set("sector", filters.sector);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.availability) params.set("availability", filters.availability);
      if (filters.areaMin) params.set("areaMin", filters.areaMin);
      if (filters.areaMax) params.set("areaMax", filters.areaMax);
      if (filters.purpose) params.set("purpose", filters.purpose);
      if (filters.bedroomsMin) params.set("bedroomsMin", filters.bedroomsMin);
      if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);

      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ q: "", district: "", sector: "", minPrice: "", maxPrice: "", availability: "", areaMin: "", areaMax: "", purpose: "", bedroomsMin: "", sort: "newest" });
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "sort" && v !== "");

  return (
    <PublicLayout>
      <div className="bg-[#fffdfb] border-b border-[#e8e1d8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1c1917]">
                {t("houseSale.title")} <Badge variant="warning" className="ml-2">VVIP</Badge>
              </h1>
              <p className="text-sm text-[#6b625b] mt-1">{total} {t("houseSale.available")}</p>
            </div>
            {/* Sorting, saving and filtering are all no-ops over an empty
                result set, so they are withheld until there is something to
                act on. The heading and search box always stay. */}
            <div className={`flex items-center gap-2 ${total === 0 && !hasActiveFilters ? "hidden" : ""}`}>
              <select
                aria-label="Sort listings"
                value={filters.sort}
                onChange={(e) => { setFilters({ ...filters, sort: e.target.value }); setPage(1); }}
                className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="popular">Most viewed</option>
              </select>
              {/* marketplace name is a stored identifier, not display copy */}
              <SaveSearchButton marketplace="House Selling VVIP" filters={filters} />
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                {t("houseSale.filters")}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
              <input
                type="text"
                placeholder={t("houseSale.searchPlaceholder")}
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6ccbf] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" size="lg">{t("houseSale.search")}</Button>
          </form>

          {showFilters && (
            <div className="mt-4 p-4 bg-[#f7f4ef] rounded-xl border border-[#e8e1d8]">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("houseSale.allDistricts")}</option>
                  {RWANDA_DISTRICTS.filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input type="text" placeholder={t("houseSale.sector")} value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <select value={filters.purpose} onChange={(e) => setFilters({ ...filters, purpose: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("houseSale.allPurposes")}</option>
                  <option value="residential">{t("houseSale.residential")}</option>
                  <option value="commercial">{t("houseSale.commercial")}</option>
                  <option value="mixed_use">{t("houseSale.mixedUse")}</option>
                </select>
                <input type="number" placeholder={t("houseSale.minPrice")} value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <input type="number" placeholder={t("houseSale.maxPrice")} value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <input type="number" placeholder={t("houseSale.minArea")} value={filters.areaMin} onChange={(e) => setFilters({ ...filters, areaMin: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <input type="number" placeholder={t("houseSale.maxArea")} value={filters.areaMax} onChange={(e) => setFilters({ ...filters, areaMax: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <select aria-label="Minimum bedrooms" value={filters.bedroomsMin} onChange={(e) => setFilters({ ...filters, bedroomsMin: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">Bedrooms: any</option>
                  {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+ beds</option>)}
                </select>
                <select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("houseSale.anyAvailability")}</option>
                  <option value="AVAILABLE">{t("houseSale.availableNow")}</option>
                  <option value="UPCOMING">{t("houseSale.comingSoon")}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-[#047857] hover:text-emerald-700 flex items-center gap-1">
                  <X className="h-3 w-3" /> {t("houseSale.clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#e8e1d8] overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          /* Two different situations behind the same empty list. With filters
             on, the fix is to widen them. With nothing filtered, the marketplace
             is simply empty, and the useful move is to list a house or look at
             another district. */
          hasActiveFilters ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title={t("houseSale.noResultsFiltered")}
              description={t("houseSale.noResultsFilteredDesc")}
              action={<Button variant="outline" onClick={clearFilters}>{t("houseSale.clearFiltersBtn")}</Button>}
            />
          ) : (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title={t("houseSale.emptyTitle")}
              description={t("houseSale.emptyDesc")}
              action={
                <Link href="/dashboard/listings/new">
                  <Button>{t("houseSale.emptyCta")}</Button>
                </Link>
              }
              secondaryAction={
                <Link href="/locations">
                  <Button variant="outline">{t("houseSale.emptySecondary")}</Button>
                </Link>
              }
              footnote={t("houseSale.emptyFootnote")}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} marketplace="house_sale" initialSaved={favIds.has(p.id)} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-2xl bg-[#f7f4ef] border border-[#e8e1d8] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#1c1917]">Buying a house in Rwanda</h2>
          <p className="mt-2 text-sm text-[#6b625b] leading-relaxed">
            Premium houses for sale in Kigali — villas in Nyarutarama, apartments in Kimihurura,
            townhouses in Kagugu, duplexes in Kibagabaga and bungalows in Kabuga. Compare
            bedrooms, bathrooms, size and price side by side, check the Igura value estimate
            against live comparables, and contact verified sellers directly.
          </p>
          <p className="mt-2 text-sm text-[#6b625b] leading-relaxed">
            Popular searches: villa for sale in Nyarutarama, apartment in Kimihurura,
            townhouse in Kagugu, duplex in Kibagabaga, bungalow in Kabuga.
          </p>
        </div>
      </div>
      <CompareTray />
    </PublicLayout>
  );
}
