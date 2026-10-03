"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export interface ParsedFilters {
  marketplace: "House Rental" | "House Selling VVIP" | "Plot Selling VIP";
  q?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  bedroomsMin?: number;
}

/** Deterministic fallback parser: bedrooms, budget, marketplace and
 *  location keywords. Runs fully client-side — no account, no key, no
 *  invented listings. */
export function parseNaturalLanguage(input: string, districts: string[]): ParsedFilters {
  const text = input.toLowerCase();
  const out: ParsedFilters = { marketplace: "House Rental" };

  if (/\b(buy|sale|purchase|vvip)\b/.test(text)) out.marketplace = "House Selling VVIP";
  else if (/\b(land|plot|farm|residential development)\b/.test(text)) out.marketplace = "Plot Selling VIP";
  else if (/\b(rent|room|apartment|student|stay)\b/.test(text)) out.marketplace = "House Rental";

  const bedMatch = text.match(/(\d+)\s*(?:bed(room)?s?|br\b|chambre)/);
  if (bedMatch) out.bedroomsMin = Math.min(20, parseInt(bedMatch[1], 10));

  const budgetMatch = text.match(/(?:under|below|max|less than|<|up to)\s*([\d, ]+)\s*(rwf|frw|rf|k)?/);
  if (budgetMatch) {
    let n = Number(budgetMatch[1].replace(/[,\s]/g, ""));
    if (/k\b/.test(budgetMatch[0]) && n < 10000) n *= 1000;
    if (Number.isFinite(n) && n > 0) out.maxPrice = Math.floor(n);
  }

  const minMatch = text.match(/(?:over|above|min|from|at least|>)\s*([\d, ]+)\s*(rwf|frw|rf|k)?/);
  if (minMatch) {
    const n = Number(minMatch[1].replace(/[,\s]/g, ""));
    if (Number.isFinite(n) && n > 0) out.minPrice = Math.floor(n);
  }

  const distHit = districts.find((d) => text.includes(d.toLowerCase()));
  if (distHit) {
    out.district = distHit;
  } else {
    // Sector/cell/village names and landmarks go through full-text search.
    const cleaned = input.replace(/[.,!?]/g, " ").trim();
    if (cleaned.length > 2) out.q = cleaned.slice(0, 100);
  }
  if (distHit && input.trim().length > distHit.length + 4) {
    out.q = input.replace(/[.,!?]/g, " ").trim().slice(0, 100);
  }

  return out;
}

const SYSTEM_PROMPT = `Extract Rwanda property search filters as JSON only, no prose. Keys: marketplace ("House Rental"|"House Selling VVIP"|"Plot Selling VIP"), q (free text or null), district (district name or null), minPrice (number|null), maxPrice (number|null), bedroomsMin (number|null). Example: {"marketplace":"House Rental","q":null,"district":"Kicukiro","minPrice":null,"maxPrice":700000,"bedroomsMin":3}`;

function coerceAiFilters(raw: any): ParsedFilters | null {
  if (!raw || typeof raw !== "object") return null;
  const markets = ["House Rental", "House Selling VVIP", "Plot Selling VIP"];
  const marketplace = markets.includes(raw.marketplace) ? raw.marketplace : "House Rental";
  const out: ParsedFilters = { marketplace: marketplace as ParsedFilters["marketplace"] };
  if (typeof raw.q === "string" && raw.q.trim()) out.q = raw.q.trim().slice(0, 100);
  if (typeof raw.district === "string" && raw.district.trim()) out.district = raw.district.trim().slice(0, 60);
  if (Number.isFinite(Number(raw.minPrice)) && Number(raw.minPrice) > 0) out.minPrice = Math.floor(Number(raw.minPrice));
  if (Number.isFinite(Number(raw.maxPrice)) && Number(raw.maxPrice) > 0) out.maxPrice = Math.floor(Number(raw.maxPrice));
  if (Number.isFinite(Number(raw.bedroomsMin)) && Number(raw.bedroomsMin) >= 0) out.bedroomsMin = Math.min(20, Math.floor(Number(raw.bedroomsMin)));
  return out;
}

export function filtersToQuery(f: ParsedFilters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.district) params.set("district", f.district);
  if (f.minPrice !== undefined) params.set("minPrice", String(f.minPrice));
  if (f.maxPrice !== undefined) params.set("maxPrice", String(f.maxPrice));
  if (f.bedroomsMin !== undefined) params.set("bedroomsMin", String(f.bedroomsMin));
  return params.toString();
}

export function marketplacePath(marketplace: ParsedFilters["marketplace"]): string {
  if (marketplace === "Plot Selling VIP") return "/plots";
  if (marketplace === "House Selling VVIP") return "/sell/houses";
  return "/rent/houses";
}

export function AiSearchBox({ districts }: { districts: string[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedFilters | null>(null);
  const [usedAi, setUsedAi] = useState(false);

  const interpret = async () => {
    const input = text.trim();
    if (input.length < 4 || busy) return;
    setBusy(true);
    setParsed(null);
    try {
      // Prefer the AI extraction when signed in and configured; any failure
      // (anonymous, no key, rate limit) falls back to the local parser.
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, systemPrompt: SYSTEM_PROMPT }),
      });
      if (res.ok) {
        const data = await res.json();
        const content: string = data?.response || data?.message || data?.text || data?.reply || "";
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const ai = coerceAiFilters(JSON.parse(jsonMatch[0]));
          if (ai && (ai.q || ai.district || ai.maxPrice !== undefined || ai.bedroomsMin !== undefined)) {
            setParsed(ai);
            setUsedAi(true);
            setBusy(false);
            return;
          }
        }
      }
    } catch {
      // Fall through to deterministic parsing.
    }
    setParsed(parseNaturalLanguage(input, districts));
    setUsedAi(false);
    setBusy(false);
  };

  const search = () => {
    if (!parsed) return;
    const qs = filtersToQuery(parsed);
    router.push(`${marketplacePath(parsed.marketplace)}${qs ? `?${qs}` : ""}`);
  };

  return (
    <div className="mt-4 max-w-4xl">
      {/* Secondary path, not a competing CTA. The emerald Search button above is
          the primary action, so this row is labelled as the alternative and the
          control is a text link rather than a second filled button. Violet was
          the only violet in the public palette and read as an accident. */}
      <div className="flex items-center gap-2">
        <span className="hidden shrink-0 text-xs font-medium text-white/60 sm:inline">Or try</span>
        {/* min-w-0 lets the input actually shrink on narrow screens instead of
            forcing the row wider than the viewport. */}
        <div className="relative min-w-0 flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6ee7b7]" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") interpret(); }}
            placeholder='Describe what you want — e.g. "3 bedroom house in Kicukiro under 700,000 RWF"'
            aria-label="Describe the property you are looking for in your own words"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/70"
          />
        </div>
        <button
          onClick={interpret}
          disabled={busy || text.trim().length < 4}
          className="shrink-0 px-2 py-2 text-sm font-semibold text-[#6ee7b7] underline underline-offset-4 transition-colors hover:text-white disabled:opacity-40 disabled:no-underline"
        >
          {busy ? "Reading…" : "Describe instead"}
        </button>
      </div>
      {parsed && (
        <div className="mt-2 bg-white rounded-xl p-4 text-sm">
          <p className="font-semibold text-slate-900 mb-1">
            I understood:{!usedAi && <span className="ml-1 font-normal text-slate-400">(quick match)</span>}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <span>Market: <strong>{parsed.marketplace}</strong></span>
            {parsed.district && <span>District: <strong>{parsed.district}</strong></span>}
            {parsed.q && !parsed.district && <span>Keywords: <strong>{parsed.q}</strong></span>}
            {parsed.q && parsed.district && <span>Also: <strong>{parsed.q}</strong></span>}
            {parsed.bedroomsMin !== undefined && <span>Bedrooms: <strong>{parsed.bedroomsMin}+</strong></span>}
            {(parsed.minPrice !== undefined || parsed.maxPrice !== undefined) && (
              <span>Budget: <strong>{parsed.minPrice ? parsed.minPrice.toLocaleString() : "0"}–{parsed.maxPrice ? parsed.maxPrice.toLocaleString() : "∞"} RWF</strong></span>
            )}
          </div>
          <button
            onClick={search}
            className="mt-3 inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 transition-colors"
          >
            Search with these filters
          </button>
        </div>
      )}
    </div>
  );
}
