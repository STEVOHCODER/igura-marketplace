"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";

/** Explore Rwanda: every district with a live listing count. Built on the
 *  existing location hierarchy — no new data needed. */
export default function LocationsPage() {
  const [districts, setDistricts] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/locations?country=Rwanda")
      .then(r => r.json())
      .then(async (d) => {
        const names: string[] = (d?.locations || []).map((l: any) => l.name);
        setDistricts(names);
        setLoading(false);
        names.forEach((name) => {
          fetch(`/api/properties?limit=1&district=${encodeURIComponent(name)}`)
            .then(r => r.json())
            .then(c => {
              if (typeof c.total === "number") setCounts(prev => ({ ...prev, [name]: c.total }));
            })
            .catch(() => {});
        });
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Explore Rwanda</h1>
        <p className="text-sm text-slate-500 mt-1">Every district Igura covers, with live listing counts.</p>
        {loading ? (
          <p className="text-slate-500 mt-6">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-6">
            {districts.map((d) => {
              const count = counts[d];
              const empty = count === 0;
              return (
                <Link
                  key={d}
                  href={`/rent/houses?district=${encodeURIComponent(d)}`}
                  className={`group rounded-xl border p-4 transition-all hover:shadow-md hover:border-emerald-300 ${
                    empty ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <MapPin className="h-5 w-5 text-emerald-600 mb-2" />
                  <p className="font-semibold text-slate-900 text-sm group-hover:text-emerald-600">{d}</p>
                  {/* Same rule as the homepage tiles: a zero reads as an opening,
                      not as a broken counter. */}
                  <p className={`text-xs ${empty ? "font-semibold text-emerald-700" : "text-slate-500"}`}>
                    {count === undefined ? "…" : empty ? "No listings yet" : `${count} listing${count === 1 ? "" : "s"}`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
