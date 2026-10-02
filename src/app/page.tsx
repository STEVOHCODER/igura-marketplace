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
      {/* Discovery hero: deep warm field, one glass panel, restrained accent. */}
      <section className="relative overflow-hidden bg-[#16130f]">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {/* Warm dark: espresso at the edges, a muted olive-emerald bloom where
              the light falls. Avoids the cold blue-slate and neon gradient that
              make a property site read as a generated dashboard. */}
          <div className="absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_-10%,#2a2416_0%,#1b1712_42%,#12100c_100%)]" />
          <div className="absolute -top-48 -right-24 h-[560px] w-[560px] rounded-full bg-[#047857]/25 blur-[130px]" />
          <div className="absolute -bottom-40 left-1/3 h-[420px] w-[520px] rounded-full bg-[#b45309]/12 blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(105% 65% at 50% 0%, #000 15%, transparent 72%)",
              WebkitMaskImage: "radial-gradient(105% 65% at 50% 0%, #000 15%, transparent 72%)",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 sm:pt-16 sm:pb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#fcd34d]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fbbf24] opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
            </span>
            Rwanda&rsquo;s property marketplace
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight text-[#fffdfb] sm:text-6xl">
            Find your next place{" "}
            <span className="gradient-text-warm">in Rwanda.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#e7e5e4]/80 sm:text-lg">
            Houses for rent, homes for sale and plots across all districts — with real prices in
            RWF and direct contact with verified owners.
          </p>

          {/* The one glass surface on the page. Everything below it is solid. */}
          <div className="glass-panel mt-9 max-w-4xl p-3 sm:p-4">
            <div className="flex gap-1 px-1 sm:gap-2 mb-3">
              {(["rent", "buy", "land"] as Tab[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors sm:px-6 ${
                    tab === k
                      ? "bg-[#047857] text-white shadow-sm"
                      : "text-[#6b625b] hover:bg-[#f7f4ef]"
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

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#e7e5e4]/70">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#34d399]" /> Verified owners</span>
            <span className="inline-flex items-center gap-1.5"><Home className="h-4 w-4 text-[#34d399]" /> {totalActive !== null ? `${totalActive} live listing${totalActive === 1 ? "" : "s"}` : "Live listings"}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-[#34d399]" /> MTN &amp; Airtel MoMo</span>
          </div>
        </div>
      </section>

      {/* Popular locations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1c1917] sm:text-2xl">Popular locations</h2>
            <p className="mt-1 text-sm text-[#6b625b]">Start with the areas people search most.</p>
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
                className="group relative overflow-hidden rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-4 transition-all hover:-translate-y-0.5 hover:border-[#d6ccbf] hover:shadow-[0_8px_20px_-6px_rgba(28,25,23,0.12)]"
              >
                <span aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-[#fef3c7] transition-transform duration-300 group-hover:scale-[2.5]" />
                <MapPin className="relative mb-2 h-5 w-5 text-[#b45309]" />
                <p className="relative text-sm font-semibold text-[#1c1917]">{tile.label}</p>
                <p className="relative text-xs text-[#6b625b]">{popCounts[tile.label] !== undefined ? `${popCounts[tile.label]} listing${popCounts[tile.label] === 1 ? "" : "s"}` : "…"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recently added */}
      {recent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#1c1917] sm:text-2xl">Recently added</h2>
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
            <h2 className="text-xl font-bold text-[#1c1917] sm:text-2xl">Most viewed right now</h2>
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
        <h2 className="text-xl font-bold text-[#1c1917] sm:text-2xl mb-1">One platform, every need</h2>
        <p className="mb-5 text-sm text-[#6b625b] sm:text-base">Rent, buy, or invest in land — pick your marketplace.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { title: "House Rental", desc: "Rooms, apartments and houses for rent.", href: "/rent/houses", icon: Home },
            { title: "Plot Selling VIP", desc: "Residential, commercial and farming plots.", href: "/plots", icon: MapPin },
            { title: "House Selling VVIP", desc: "Premium houses for sale across Rwanda.", href: "/sell/houses", icon: Building2 },
          ].map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group relative overflow-hidden rounded-[18px] border border-[#e8e1d8] bg-[#fffdfb] p-6 transition-all hover:-translate-y-1 hover:border-[#d6ccbf] hover:shadow-[0_12px_28px_-8px_rgba(28,25,23,0.14)]"
            >
              <span aria-hidden className="absolute -right-8 -top-8 h-28 w-28 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#fef3c7] transition-transform duration-500 group-hover:scale-[2.2]" />
              <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#047857]/10 transition-colors group-hover:bg-[#047857]">
                <m.icon className="h-6 w-6 text-[#047857] transition-colors group-hover:text-white" />
              </div>
              <h3 className="relative mt-4 text-lg font-bold text-[#1c1917] transition-colors group-hover:text-[#047857]">{m.title}</h3>
              <p className="relative mt-1 text-sm text-[#6b625b]">{m.desc}</p>
              <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#047857]">
                Browse
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* List CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="relative overflow-hidden rounded-3xl bg-[#16130f] px-6 py-12 text-center sm:p-16">
          <div aria-hidden className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(95%_125%_at_50%_0%,#2a2416_0%,#1b1712_55%,#12100c_100%)]" />
            <div className="absolute -top-28 left-1/2 h-64 w-[700px] -translate-x-1/2 rounded-full bg-[#b45309]/16 blur-[110px]" />
          </div>

          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#fffdfb] sm:text-4xl">
              Own a property? List it in minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-[#e7e5e4]/75">
              Reach renters and buyers across Rwanda. Listing is free during launch — add a photo
              and your property goes live.
            </p>
            <Link
              href="/register"
              className="group relative mt-8 inline-flex items-center gap-2 rounded-xl bg-[#047857] px-7 py-3.5 font-semibold text-white transition-all hover:bg-[#065f46]"
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
