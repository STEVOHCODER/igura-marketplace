"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Trash2, Search } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

/** Build the listing URL a saved search points at. */
function searchUrl(s: any): string {
  const q = s.query || {};
  const base =
    s.marketplace === "Plot Selling VIP" ? "/plots" :
    s.marketplace === "House Selling VVIP" ? "/sell/houses" : "/rent/houses";
  const params = new URLSearchParams();
  for (const k of ["q", "district", "minPrice", "maxPrice", "bedroomsMin"]) {
    if (q[k] !== undefined && q[k] !== "") params.set(k, String(q[k]));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function describeQuery(q: any): string {
  const parts: string[] = [];
  if (q.q) parts.push(`"${q.q}"`);
  if (q.district) parts.push(q.district);
  if (q.bedroomsMin) parts.push(`${q.bedroomsMin}+ beds`);
  if (q.minPrice || q.maxPrice) {
    parts.push(`${q.minPrice ? Number(q.minPrice).toLocaleString() : "0"}–${q.maxPrice ? Number(q.maxPrice).toLocaleString() : "∞"} RWF`);
  }
  return parts.join(" · ") || "All listings";
}

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const reload = () => {
    fetch("/api/saved-searches")
      .then(r => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        return r.json();
      })
      .then(d => { if (d) setSearches(d.searches || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this saved search?")) return;
    const res = await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setSearches(prev => prev.filter(s => s.id !== id));
    } else {
      toast("Could not delete", "error");
    }
  };

  const toggleAlerts = async (s: any) => {
    const res = await fetch("/api/saved-searches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, alertsOn: !s.alertsOn }),
    });
    if (res.ok) {
      setSearches(prev => prev.map(x => x.id === s.id ? { ...x, alertsOn: !x.alertsOn } : x));
    } else {
      toast("Could not update", "error");
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900">My saved searches</h1>
        <p className="text-sm text-slate-500 mt-1">
          We flag new matches per search. Save a search from any listing page with “Save search”.
        </p>
        {loading ? (
          <p className="text-slate-500 mt-6">Loading…</p>
        ) : searches.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="No saved searches"
              description="Filter any listing page, then save the search to watch for new matches."
            />
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {searches.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      {s.alertsOn && s.newMatches > 0 && (
                        <Badge variant="success">{s.newMatches} new</Badge>
                      )}
                      {!s.alertsOn && <Badge variant="default">paused</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {s.marketplace || "Any marketplace"} · {describeQuery(s.query || {})} · {s.totalMatches} match{s.totalMatches === 1 ? "" : "es"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={searchUrl(s)}>
                      <Button variant="outline" size="sm">View</Button>
                    </Link>
                    <Button variant="outline" size="sm" onClick={() => toggleAlerts(s)} title={s.alertsOn ? "Pause alerts" : "Resume alerts"}>
                      <BellRing className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(s.id)} title="Delete search">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
