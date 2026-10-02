"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, ShieldCheck, Home, Building2, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { CompareTray } from "@/components/ui/compare-tray";
import { AiSearchBox } from "@/components/ui/ai-search-box";
import { useI18n } from "@/i18n";
import { formatPrice } from "@/lib/utils";

type Tab = "rent" | "buy" | "land";

const TAB_TARGET: Record<Tab, { path: string; marketplace: string }> = {
  rent: { path: "/rent/houses", marketplace: "House Rental" },
  buy: { path: "/sell/houses", marketplace: "House Selling VVIP" },
  land: { path: "/plots", marketplace: "Plot Selling VIP" },
};

const POPULAR_DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge", "Bugesera", "Musanze", "Rubavu"];

// Kigali's urban divisions live in the *sector* field on listings
// (districts read "Kigali City"), while upcountry areas match the district
// field. Tiles query whichever field actually hits.
const POPULAR_TILES: { label: string; district?: string; sector?: string }[] = [
  { label: "Gasabo", sector: "Gasabo" },
  { label: "Kicukiro", sector: "Kicukiro" },
  { label: "Nyarugenge", sector: "Nyarugenge" },
  { label: "Bugesera", district: "Bugesera" },
  { label: "Musanze", district: "Musanze" },
  { label: "Rubavu", district: "Rubavu" },
];

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("rent");
  const [location, setLocation] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [propType, setPropType] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [featured, setFeatured] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [popCounts, setPopCounts] = useState<Record<string, number>>({});
  const [totalActive, setTotalActive] = useState<number | null>(null);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const debounce = useRef<any>(null);

  useEffect(() => {
    fetch("/api/locations?country=Rwanda")
      .then(r => r.json())
      .then(d => setDistricts((d?.locations || []).map((l: any) => l.name)))
      .catch(() => {});
    fetch("/api/property-types")
      .then(r => r.json())
      .then(d => setTypes(d?.propertyTypes || d?.types || []))
      .catch(() => {});
    fetch("/api/featured")
      .then(r => r.json())
      .then(d => setFeatured(d.listings || []))
      .catch(() => {});
    fetch("/api/properties?limit=6")
      .then(r => r.json())
      .then(d => setRecent(d.properties || []))
      .catch(() => {});
    fetch("/api/properties?limit=1")
      .then(r => r.json())
      .then(d => setTotalActive(typeof d.total === "number" ? d.total : null))
      .catch(() => {});
    fetch("/api/favorites")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.favorites) setFavIds(new Set(d.favorites.map((f: any) => f.id)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    POPULAR_TILES.forEach((tile) => {
      const params = new URLSearchParams({ limit: "1", marketplace: "House Rental" });
      if (tile.district) params.set("district", tile.district);
      if (tile.sector) params.set("sector", tile.sector);
      fetch(`/api/properties?${params.toString()}`)
        .then(r => r.json())
        .then(d => {
          if (typeof d.total === "number") setPopCounts(prev => ({ ...prev, [tile.label]: d.total }));
        })
        .catch(() => {});
    });
  }, []);

  const typeOptions = useMemo(() => {
    const target = TAB_TARGET[tab].marketplace;
    return types.filter((x: any) => x.marketplace?.name === target || x.marketplaceId === target);
  }, [types, tab]);

  useEffect(() => { setPropType(""); }, [tab]);

  // Location first tries an exact district match; anything else (sectors,
  // cells, free text) goes through full-text search, which covers the
  // sector/cell fields the hierarchy names live in.
  const locationParams = (loc: string, params: URLSearchParams) => {
    const match = districts.find(d => d.toLowerCase() === loc.toLowerCase());
    if (match) params.set("district", match);
    else params.set("q", loc);
  };

  // Live result count for the search button (Tura-style), debounced.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("marketplace", TAB_TARGET[tab].marketplace);
        params.set("limit", "1");
        const loc = location.trim();
        if (loc) locationParams(loc, params);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (bedrooms && tab !== "land") params.set("bedroomsMin", bedrooms);
        if (propType) params.set("propertyType", propType);
        const r = await fetch(`/api/properties?${params.toString()}`);
        const d = await r.json();
        setLiveCount(typeof d.total === "number" ? d.total : null);
      } catch {
        setLiveCount(null);
      }
    }, 450);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [tab, location, minPrice, maxPrice, bedrooms, propType, districts]);

  const doSearch = () => {
    const params = new URLSearchParams();
    const loc = location.trim();
    if (loc) locationParams(loc, params);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms && tab !== "land") params.set("bedroomsMin", bedrooms);
    if (propType) params.set("propertyType", propType);
    const qs = params.toString();
    router.push(`${TAB_TARGET[tab].path}${qs ? `?${qs}` : ""}`);
  };

  return (
    <PublicLayout>
      {/* Discovery hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight max-w-3xl">
            Find your next place in Rwanda.
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-2xl">
            Houses for rent, homes for sale and plots across all districts — from verified owners.
          </p>

          {/* Search card */}
          <div className="mt-8 max-w-4xl bg-white rounded-2xl shadow-2xl p-3 sm:p-4">
            <div className="flex gap-1 sm:gap-2 mb-3 px-1">
              {(["rent", "buy", "land"] as Tab[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === k ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {k === "rent" ? t("hero.findHouse") : k === "buy" ? t("hero.sellHouse") : t("hero.findPlot")}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr] gap-2">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
                  placeholder="Where are you looking? District, sector…"
                  list="igura-districts"
                  className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <datalist id="igura-districts">
                  {districts.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div className="flex gap-2">
                <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" inputMode="numeric" className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" inputMode="numeric" className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-2">
                {tab !== "land" ? (
                  <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Bedrooms</option>
                    {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+</option>)}
                  </select>
                ) : null}
                <select value={propType} onChange={(e) => setPropType(e.target.value)} className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">All types</option>
                  {typeOptions.map((x: any) => <option key={x.id} value={x.slug || x.id}>{x.displayName || x.name}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={doSearch}
              className="mt-3 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-emerald-500 transition-colors"
            >
              <Search className="h-5 w-5" />
              Search{liveCount !== null ? ` (${liveCount})` : ""}
            </button>
          </div>

          <AiSearchBox districts={districts} />

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Verified owners</span>
            <span className="inline-flex items-center gap-1.5"><Home className="h-4 w-4 text-emerald-400" /> {totalActive !== null ? `${totalActive} live listings` : "Live listings"}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-400" /> Secure MoMo payments</span>
          </div>
        </div>
      </section>

      {/* Popular locations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Popular locations</h2>
          <Link href="/locations" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline">
            Explore all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {POPULAR_TILES.filter((tile) => popCounts[tile.label] === undefined || popCounts[tile.label] > 0).map((tile) => {
            const params = new URLSearchParams();
            if (tile.district) params.set("district", tile.district);
            if (tile.sector) params.set("sector", tile.sector);
            return (
              <Link key={tile.label} href={`/rent/houses?${params.toString()}`} className="group rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:border-emerald-300 transition-all">
                <MapPin className="h-5 w-5 text-emerald-600 mb-2" />
                <p className="font-semibold text-slate-900 text-sm">{tile.label}</p>
                <p className="text-xs text-slate-500">{popCounts[tile.label] !== undefined ? `${popCounts[tile.label]} listings` : "…"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recently added */}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Recently added</h2>
            <Link href="/rent/houses" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recent.map((p: any) => (
              <PropertyCard key={p.id} property={p} initialSaved={favIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Most viewed */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Most viewed right now</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((p: any) => (
              <PropertyCard key={p.id} property={p} initialSaved={favIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Marketplaces */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">One platform, every need</h2>
        <p className="text-slate-500 mb-5 text-sm sm:text-base">Rent, buy, or invest in land — pick your marketplace.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "House Rental", desc: "Rooms, apartments and houses for rent.", href: "/rent/houses", icon: Home },
            { title: "Plot Selling VIP", desc: "Residential, commercial and farming plots.", href: "/plots", icon: MapPin },
            { title: "House Selling VVIP", desc: "Premium houses for sale across Rwanda.", href: "/sell/houses", icon: Building2 },
          ].map((m) => (
            <Link key={m.title} href={m.href} className="group rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg hover:border-emerald-300 transition-all">
              <m.icon className="h-8 w-8 text-emerald-600 mb-3" />
              <h3 className="font-bold text-slate-900 text-lg group-hover:text-emerald-600">{m.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
              <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600">Browse <ArrowRight className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      {/* List CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="rounded-2xl bg-slate-900 px-6 py-10 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/10 rounded-full blur-3xl" />
          <h2 className="relative text-2xl sm:text-3xl font-bold text-white">Own a property? List it in minutes.</h2>
          <p className="relative text-slate-300 mt-2">Reach renters and buyers across Rwanda. Drafts are free — you only need a slot when you publish.</p>
          <Link href="/register" className="relative mt-6 inline-flex items-center gap-2 bg-emerald-600 text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-emerald-500 transition-colors">
            <Sparkles className="h-5 w-5" /> List your property
          </Link>
        </div>
      </section>
      <CompareTray />
    </PublicLayout>
  );
}
