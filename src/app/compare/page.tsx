"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GitCompare } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const ROWS: { key: string; label: string; render: (p: any) => string }[] = [
  { key: "price", label: "Price", render: (p) => `${formatPrice(p.price)}${p.marketplace?.name === "House Selling VVIP" || p.marketplace?.name === "Plot Selling VIP" ? "" : "/mo"}` },
  { key: "type", label: "Type", render: (p) => p.propertyType?.displayName || "—" },
  { key: "beds", label: "Bedrooms", render: (p) => p.bedrooms ?? "—" },
  { key: "baths", label: "Bathrooms", render: (p) => p.bathrooms ?? "—" },
  { key: "area", label: "Size", render: (p) => (p.areaValue ? `${p.areaValue} ${p.areaUnit === "SQM" ? "m²" : p.areaUnit || ""}` : "—") },
  { key: "location", label: "Location", render: (p) => [p.locationSector, p.locationDistrict].filter(Boolean).join(", ") || "—" },
  { key: "status", label: "Availability", render: (p) => p.availabilityStatus || "—" },
  { key: "negotiable", label: "Negotiable", render: (p) => (p.negotiable ? "Yes" : "No") },
  { key: "verified", label: "Owner", render: (p) => (p.verifiedOwner ? "Verified owner" : "Standard") },
];

export default function ComparePage() {
  const [ids, setIds] = useState<string[]>([]);
  const [props, setProps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const list = (sp.get("ids") || "").split(",").map(s => s.trim()).filter(s => /^[0-9a-fA-F]{24}$/.test(s)).slice(0, 4);
    setIds(list);
    if (list.length === 0) { setLoading(false); return; }
    Promise.all(list.map(id => fetch(`/api/properties/${id}`).then(r => (r.ok ? r.json() : null)).catch(() => null)))
      .then(async (results) => {
        // Detail responses may nest under .property; normalize.
        const normalized = results.map((d: any) => d?.property || d).filter(Boolean);
        // Attach verified flags via the list endpoint data where possible.
        setProps(normalized);
      })
      .finally(() => setLoading(false));
  }, []);

  const remove = (id: string) => {
    try {
      const raw = localStorage.getItem("igura-compare-ids");
      const arr = JSON.parse(raw || "[]").filter((x: string) => x !== id);
      localStorage.setItem("igura-compare-ids", JSON.stringify(arr));
      window.dispatchEvent(new Event("igura-compare-change"));
    } catch { /* ignore */ }
    setIds(prev => prev.filter(x => x !== id));
    setProps(prev => prev.filter(p => p.id !== id));
  };

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Compare properties</h1>
        <p className="text-sm text-slate-500 mt-1">Side by side, up to 4. Add more from any listing card.</p>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
          </div>
        ) : props.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<GitCompare className="h-12 w-12" />}
              title="Nothing to compare"
              description="Tap the compare icon on property cards to build a comparison."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px] border-separate" style={{ borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th className="text-left p-3 w-28" />
                  {props.map((p: any) => (
                    <th key={p.id} className="p-3 text-left align-top min-w-[180px]">
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                        {p.images?.[0]?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0].url} alt={p.title} className="w-full aspect-[4/3] object-cover" />
                        ) : (
                          <div className="w-full aspect-[4/3] bg-slate-100" />
                        )}
                        <div className="p-3">
                          <Link href={`/rent/houses/${p.slug}`} className="font-semibold text-slate-900 hover:text-emerald-600 line-clamp-2">
                            {p.title}
                          </Link>
                          <button onClick={() => remove(p.id)} className="mt-2 text-xs text-red-600 hover:underline">Remove</button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-slate-100">
                    <td className="p-3 font-medium text-slate-500 whitespace-nowrap">{row.label}</td>
                    {props.map((p: any) => (
                      <td key={p.id} className="p-3 text-slate-900">{String(row.render(p))}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-slate-100">
                  <td className="p-3 font-medium text-slate-500">Contact</td>
                  {props.map((p: any) => (
                    <td key={p.id} className="p-3">
                      <Link href={`/rent/houses/${p.slug}`} className="text-emerald-600 font-medium hover:underline">View listing</Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
            <div className="mt-4 flex flex-wrap gap-2">
              {props.map((p: any) => <Badge key={p.id} variant="default">{p.title}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
