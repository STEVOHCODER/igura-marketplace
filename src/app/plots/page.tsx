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
import { useI18n } from "@/i18n";
  import Link from "next/link";

const RWANDA_DISTRICTS = [
  "Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare",
  "Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera","Nyamasheke",
  "Rulindo","Burera","Gakenke","Ngoma","Kirehe","Gatsibo","Nyamagabe","Nyaruguru","Ruhango","Kamonyi"
];

export default function PlotSearchPage() {
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
    sort: "newest",
  });
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // Deep links (homepage search, saved searches, shared URLs) arrive as
  // query params; adopt them once on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const patch: Record<string, string> = {};
    for (const k of ["q", "district", "sector", "minPrice", "maxPrice", "availability", "areaMin", "areaMax", "purpose"]) {
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
      params.set("marketplace", "Plot Selling VIP");
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
    setFilters({ q: "", district: "", sector: "", minPrice: "", maxPrice: "", availability: "", areaMin: "", areaMax: "", purpose: "", sort: "newest" });
    setPage(1);
  };

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k !== "sort" && v !== "");

  return (
    <PublicLayout>
      <div className="bg-[#fffdfb] border-b border-[#e8e1d8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {/* No VIP badge: listing is free during launch, so advertising a
                  paid tier on the public page contradicts the checkout state. */}
              <h1 className="text-2xl font-bold text-[#1c1917]">{t("plots.title")}</h1>
              <p className="text-sm text-[#6b625b] mt-1">{total} {t("plots.available")}</p>
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
              <SaveSearchButton marketplace="Plot Selling VIP" filters={filters} />
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                {t("plots.filters")}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a8a29e]" />
              <input
                type="text"
                placeholder={t("plots.searchPlaceholder")}
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#d6ccbf] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" size="lg">{t("plots.search")}</Button>
          </form>

          {showFilters && (
            <div className="mt-4 p-4 bg-[#f7f4ef] rounded-xl border border-[#e8e1d8]">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("plots.allDistricts")}</option>
                  {RWANDA_DISTRICTS.filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input type="text" placeholder={t("plots.sector")} value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <select value={filters.purpose} onChange={(e) => setFilters({ ...filters, purpose: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("plots.allPurposes")}</option>
                  <option value="residential">{t("plots.residential")}</option>
                  <option value="commercial">{t("plots.commercial")}</option>
                  <option value="farming">{t("plots.farming")}</option>
                  <option value="industrial">{t("plots.industrial")}</option>
                </select>
                <input type="number" placeholder={t("plots.minPrice")} value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <input type="number" placeholder={t("plots.maxPrice")} value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <input type="number" placeholder={t("plots.minArea")} value={filters.areaMin} onChange={(e) => setFilters({ ...filters, areaMin: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <input type="number" placeholder={t("plots.maxArea")} value={filters.areaMax} onChange={(e) => setFilters({ ...filters, areaMax: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm" />
                <select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} className="rounded-lg border border-[#d6ccbf] px-3 py-2 text-sm bg-[#fffdfb]">
                  <option value="">{t("plots.anyAvailability")}</option>
                  <option value="AVAILABLE">{t("plots.availableNow")}</option>
                  <option value="UPCOMING">{t("plots.comingSoon")}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-[#047857] hover:text-emerald-700 flex items-center gap-1">
                  <X className="h-3 w-3" /> {t("plots.clearFilters")}
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
             is simply empty, and the useful move is to list a plot or look at
             another district. */
          hasActiveFilters ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title={t("plots.noResultsFiltered")}
              description={t("plots.noResultsFilteredDesc")}
              action={<Button variant="outline" onClick={clearFilters}>{t("plots.clearFiltersBtn")}</Button>}
            />
          ) : (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title={t("plots.emptyTitle")}
              description={t("plots.emptyDesc")}
              action={
                <Link href="/dashboard/listings/new">
                  <Button>{t("plots.emptyCta")}</Button>
                </Link>
              }
              secondaryAction={
                <Link href="/locations">
                  <Button variant="outline">{t("plots.emptySecondary")}</Button>
                </Link>
              }
              footnote={t("plots.emptyFootnote")}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} marketplace="plot_sale" initialSaved={favIds.has(p.id)} />
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
          <h2 className="text-lg font-bold text-[#1c1917]">Buying land in Rwanda</h2>
          <p className="mt-2 text-sm text-[#6b625b] leading-relaxed">
            Compare residential, commercial and agricultural plots for sale across Rwanda —
            Kimironko, Remera, Gitega and Bugesera, with area in m² and prices in RWF on every
            listing. Check the location hierarchy (district, sector, cell) and reveal the
            seller&apos;s verified contact before you visit the site.
          </p>
          <p className="mt-2 text-sm text-[#6b625b] leading-relaxed">
            Popular searches: residential plot in Kimironko, commercial plot on KN5 Road,
            agricultural land in Bugesera, plot in Gitega. Save a search to catch new land
            the day it lists.
          </p>
        </div>
      </div>
      <CompareTray />
    </PublicLayout>
  );
}
