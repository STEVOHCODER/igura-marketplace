"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X, Home } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { SaveSearchButton } from "@/components/ui/save-search-button";
import { CompareTray } from "@/components/ui/compare-tray";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const RWANDA_DISTRICTS = [
  "Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare",
  "Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera","Nyamasheke",
  "Rulindo","Burera","Gakenke","Musanze","Ngoma","Kirehe","Gatsibo",
  "Nyamagabe","Nyaruguru","Ruhango","Kamonyi","Muhanga","Nyarabagoyi"
];

export default function HouseSearchPage() {
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
    propertyType: "",
    minPrice: "",
    maxPrice: "",
    availability: "",
    negotiable: "",
    bedroomsMin: "",
    sort: "newest",
  });
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Deep links (homepage search, saved searches, shared URLs) arrive as
  // query params; adopt them once on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const patch: Record<string, string> = {};
    for (const k of ["q", "district", "sector", "propertyType", "minPrice", "maxPrice", "availability", "negotiable", "bedroomsMin"]) {
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
      params.set("marketplace", "House Rental");
      params.set("page", page.toString());
      params.set("limit", "12");
      if (filters.q) params.set("q", filters.q);
      if (filters.district) params.set("district", filters.district);
      if (filters.sector) params.set("sector", filters.sector);
      if (filters.propertyType) params.set("propertyType", filters.propertyType);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.availability) params.set("availability", filters.availability);
      if (filters.negotiable) params.set("negotiable", filters.negotiable);
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
    setFilters({ q: "", district: "", sector: "", propertyType: "", minPrice: "", maxPrice: "", availability: "", negotiable: "", bedroomsMin: "", sort: "newest" });
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "sort" && v !== "");

  return (
    <PublicLayout>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t("houses.title")}</h1>
              <p className="text-sm text-slate-500 mt-1">{total} {t("houses.available")}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="Sort listings"
                value={filters.sort}
                onChange={(e) => { setFilters({ ...filters, sort: e.target.value }); setPage(1); }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="popular">Most viewed</option>
              </select>
              <SaveSearchButton marketplace="House Rental" filters={filters} />
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                {t("houses.filters")}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                aria-label="Search houses"
                placeholder={t("houses.searchPlaceholder")}
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" size="lg">{t("houses.search")}</Button>
          </form>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <select aria-label="Filter by district" value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houses.allDistricts")}</option>
                  {RWANDA_DISTRICTS.filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input type="text" aria-label="Filter by sector" placeholder={t("plots.sector")} value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <select aria-label="Filter by property type" value={filters.propertyType} onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houses.allTypes")}</option>
                  <option value="shambrette">Shambrette</option>
                  <option value="room_salon">Room + Salon</option>
                  <option value="2_room_salon">2 Rooms + Salon</option>
                  <option value="3_room_salon">3 Rooms + Salon</option>
                  <option value="other">Other</option>
                </select>
                <input type="number" placeholder={t("houses.minPrice")} value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" placeholder={t("houses.maxPrice")} value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <select aria-label="Minimum bedrooms" value={filters.bedroomsMin} onChange={(e) => setFilters({ ...filters, bedroomsMin: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">Bedrooms: any</option>
                  {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+ beds</option>)}
                </select>
                <select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houses.anyAvailability")}</option>
                  <option value="AVAILABLE">{t("houses.availableNow")}</option>
                  <option value="UPCOMING">{t("houses.comingSoon")}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                  <X className="h-3 w-3" /> {t("houses.clearFilters")}
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
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
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
          <EmptyState
            icon={<Home className="h-12 w-12" />}
            title={t("houses.noResults")}
            description={t("houses.noResultsDesc")}
            action={hasActiveFilters ? <Button variant="outline" onClick={clearFilters}>{t("houses.clearFiltersBtn")}</Button> : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} marketplace="house_rental" initialSaved={favIds.has(p.id)} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900">Renting a house in Rwanda</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Looking for a house for rent in Kigali? Browse rooms, studios, apartments, townhouses,
            duplexes and villas for rent in Gasabo, Kicukiro and Nyarugenge — including Remera,
            Kimironko, Kacyiru, Gacuriro, Kagugu, Kanombe, Gatenga, Nyabugogo and Gitega.
            Every listing shows the real price in RWF, bedrooms, size and availability, and numbers
            from verified owners can be revealed instantly with Mobile Money.
          </p>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Popular searches: apartment for rent in Remera, house for rent in Kimironko,
            room for rent in Kicukiro, studio in Nyabugogo, townhouse near Kacyiru.
            Save any search to get flagged when new matches land.
          </p>
        </div>
      </div>
      <CompareTray />
    </PublicLayout>
  );
}
