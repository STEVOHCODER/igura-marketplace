"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X, MapPin, Lock, LogIn } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";

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
  const [needsAuth, setNeedsAuth] = useState(false);
  const [needsMembership, setNeedsMembership] = useState(false);
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
  });

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

      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      setProperties(data.properties || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setNeedsAuth(data.needsAuth || false);
      setNeedsMembership(data.needsMembership || false);
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
    setFilters({ q: "", district: "", sector: "", minPrice: "", maxPrice: "", availability: "", areaMin: "", areaMax: "", purpose: "" });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <PublicLayout>
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {t("houseSale.title")} <Badge variant="warning" className="ml-2">VVIP</Badge>
              </h1>
              <p className="text-sm text-slate-500 mt-1">{total} {t("houseSale.available")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              {t("houseSale.filters")}
            </Button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("houseSale.searchPlaceholder")}
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" size="lg">{t("houseSale.search")}</Button>
          </form>

          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <select value={filters.district} onChange={(e) => setFilters({ ...filters, district: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houseSale.allDistricts")}</option>
                  {RWANDA_DISTRICTS.filter((d, i, a) => a.indexOf(d) === i).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input type="text" placeholder={t("houseSale.sector")} value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <select value={filters.purpose} onChange={(e) => setFilters({ ...filters, purpose: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houseSale.allPurposes")}</option>
                  <option value="residential">{t("houseSale.residential")}</option>
                  <option value="commercial">{t("houseSale.commercial")}</option>
                  <option value="mixed_use">{t("houseSale.mixedUse")}</option>
                </select>
                <input type="number" placeholder={t("houseSale.minPrice")} value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" placeholder={t("houseSale.maxPrice")} value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <input type="number" placeholder={t("houseSale.minArea")} value={filters.areaMin} onChange={(e) => setFilters({ ...filters, areaMin: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" placeholder={t("houseSale.maxArea")} value={filters.areaMax} onChange={(e) => setFilters({ ...filters, areaMax: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                <select value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                  <option value="">{t("houseSale.anyAvailability")}</option>
                  <option value="AVAILABLE">{t("houseSale.availableNow")}</option>
                  <option value="UPCOMING">{t("houseSale.comingSoon")}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="mt-3 text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1">
                  <X className="h-3 w-3" /> {t("houseSale.clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(needsAuth || needsMembership) && !loading ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {needsAuth ? t("houseSale.signInTitle") : t("houseSale.membershipTitle")}
            </h2>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {needsAuth ? t("houseSale.signInDesc") : t("houseSale.membershipDesc")}
            </p>
            <div className="flex items-center justify-center gap-3">
              {needsAuth ? (
                <>
                  <a href="/login" className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-violet-700 transition-colors">
                    <LogIn className="h-4 w-4" /> {t("houseSale.signIn")}
                  </a>
                  <a href="/register" className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                    {t("houseSale.createAccount")}
                  </a>
                </>
              ) : (
                <a href="/dashboard/memberships" className="inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-violet-700 transition-colors">
                  {t("houseSale.getMembership")}
                </a>
              )}
            </div>
          </div>
        ) : loading ? (
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
            icon={<MapPin className="h-12 w-12" />}
            title={t("houseSale.noResults")}
            description={t("houseSale.noResultsDesc")}
            action={hasActiveFilters ? <Button variant="outline" onClick={clearFilters}>{t("houseSale.clearFiltersBtn")}</Button> : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} marketplace="house_sale" />
              ))}
            </div>
            <div className="mt-8">
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
