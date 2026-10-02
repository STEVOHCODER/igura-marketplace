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
  // Set once /api/home resolves. Until then the debounced count effect must stay
  // idle, otherwise it fires a redundant request that /api/home is about to
  // make redundant.
  const [homeLoaded, setHomeLoaded] = useState(false);
  const debounce = useRef<any>(null);

  useEffect(() => {
    // One request instead of the previous fan-out (locations, property types,
    // featured, recent, a total, plus one query per popular tile): a dozen cold
    // serverless round trips, each waiting on its own MongoDB query, and the
    // page could not paint until the slowest one finished. See /api/home.
    fetch("/api/home")
      .then((r) => r.json())
      .then((d) => {
        if (!d || d.error) return;
        setDistricts(d.districts || []);
        setTypes(d.propertyTypes || []);
        setFeatured(d.featured || []);
        setRecent(d.recent || []);
        setTotalActive(typeof d.totalActive === "number" ? d.totalActive : null);
        setLiveCount(typeof d.totalActive === "number" ? d.totalActive : null);
        setPopCounts(d.popularCounts || {});
        setHomeLoaded(true);
      })
      .catch(() => setHomeLoaded(true));

    // Session-scoped, so it cannot fold into the public payload above.
    fetch("/api/favorites")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.favorites) setFavIds(new Set(d.favorites.map((f: any) => f.id)));
      })
      .catch(() => {});
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
    const loc = location.trim();
    const hasFilter = !!loc || !!minPrice || !!maxPrice || !!bedrooms || !!propType;

    // With no filter applied the count is just "listings in this marketplace",
    // which /api/home already returns. Waiting for it to land avoids a duplicate
    // request on mount.
    if (!homeLoaded) return;
    if (!hasFilter && liveCount != null) return;

    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("marketplace", TAB_TARGET[tab].marketplace);
        params.set("limit", "1");
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
  }, [tab, location, minPrice, maxPrice, bedrooms, propType, liveCount, homeLoaded]);

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
      <section className="relative overflow-hidden bg-slate-950">
        {/* Layered depth instead of a flat gradient: a base wash, two colour
            pools, a faint architectural grid and a vignette. All decorative and
            pointer-events-none, so they add atmosphere without costing a repaint
            on scroll or shifting layout (CLS stays at 0). */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_0%,#0f3d33_0%,#0b1f1c_45%,#020617_100%)]" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(100% 70% at 50% 0%, #000 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(100% 70% at 50% 0%, #000 20%, transparent 75%)",
            }}
          />
          <div className="absolute -top-40 -right-24 h-[520px] w-[520px] rounded-full bg-emerald-400/20 blur-[120px]" />
          <div className="absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-teal-500/10 blur-[110px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Rwanda&rsquo;s property marketplace
          </p>

          <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.05] max-w-3xl">
            Find your next place{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              in Rwanda.
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300/90 max-w-2xl leading-relaxed">
            Houses for rent, homes for sale and plots across all districts — with real prices in
            RWF and direct contact with verified owners.
          </p>

          {/* Search card */}
          <div className="mt-9 max-w-4xl rounded-2xl bg-white/95 backdrop-blur-sm p-3 sm:p-4 shadow-[0_24px_60px_-12px_rgba(2,6,23,0.45)] ring-1 ring-white/60">
            <div className="flex gap-1 sm:gap-2 mb-3 px-1">
              {(["rent", "buy", "land"] as Tab[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    tab === k ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
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

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300/80">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Verified owners</span>
            <span className="inline-flex items-center gap-1.5"><Home className="h-4 w-4 text-emerald-400" /> {totalActive !== null ? `${totalActive} live listing${totalActive === 1 ? "" : "s"}` : "Live listings"}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-400" /> Secure MoMo payments</span>
          </div>
        </div>
      </section>

      {/* Popular locations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Popular locations</h2>
            <p className="mt-1 text-sm text-slate-500">Start with the areas people search most.</p>
          </div>
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
              <Link
                key={tile.label}
                href={`/rent/houses?${params.toString()}`}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-900/5"
              >
                <span aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-emerald-50 transition-transform duration-300 group-hover:scale-[2.5]" />
                <MapPin className="relative h-5 w-5 text-emerald-600 mb-2" />
                <p className="relative font-semibold text-slate-900 text-sm">{tile.label}</p>
                <p className="relative text-xs text-slate-500">{popCounts[tile.label] !== undefined ? `${popCounts[tile.label]} listing${popCounts[tile.label] === 1 ? "" : "s"}` : "…"}</p>
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
            <Link
              key={m.title}
              href={m.href}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5"
            >
              <span aria-hidden className="absolute right-0 top-0 h-24 w-24 translate-x-1/3 -translate-y-1/3 rounded-full bg-gradient-to-br from-emerald-100 to-transparent transition-transform duration-500 group-hover:scale-150" />
              <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 transition-colors group-hover:bg-emerald-600">
                <m.icon className="h-6 w-6 text-emerald-600 transition-colors group-hover:text-white" />
              </div>
              <h3 className="relative mt-4 font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">{m.title}</h3>
              <p className="relative text-sm text-slate-500 mt-1">{m.desc}</p>
              <span className="relative inline-flex items-center gap-1 mt-4 text-sm font-semibold text-emerald-600">
                Browse
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* List CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-12 sm:p-16 text-center">
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_0%,#134e4a_0%,#0f172a_60%)]" />
            <div className="absolute -top-24 left-1/2 h-64 w-[680px] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-[100px]" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              Own a property? List it in minutes.
            </h2>
            <p className="mt-3 text-slate-300/90 max-w-xl mx-auto leading-relaxed">
              Reach renters and buyers across Rwanda. Listing is free during launch — add a photo
              and your property goes live.
            </p>
            <Link
              href="/register"
              className="group relative mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/30 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/20"
            >
              <Sparkles className="h-5 w-5" />
              List your property
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      <CompareTray />
    </PublicLayout>
  );
}
