"use client";
import { useEffect, useState } from "react";
import { Search, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/listings")
      .then(r => r.json())
      .then(d => setListings(d?.listings || []))
      .finally(() => setLoading(false));
  }, []);

  const removeListing = async (id: string) => {
    if (!confirm("Remove this listing?")) return;
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Listing removed", "success");
        setListings(prev => prev.filter(l => l.id !== id));
      }
    } catch {
      toast("Failed to remove listing", "error");
    }
  };

  const filtered = listings.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.owner?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Manage Listings</h1>
      <p className="text-slate-500 mb-6">{listings.length} total listings</p>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Property</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Marketplace</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No listings found</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{l.title}</div>
                      <div className="text-xs text-slate-400">{l.locationDistrict}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.owner?.firstName} {l.owner?.lastName}</td>
                    <td className="px-4 py-3"><Badge variant="outline">{l.marketplace?.displayName}</Badge></td>
                    <td className="px-4 py-3 font-medium">{formatPrice(l.price)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={l.status === "ACTIVE" ? "success" : l.status === "UNAVAILABLE" ? "danger" : "default"}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="destructive" size="sm" onClick={() => removeListing(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
