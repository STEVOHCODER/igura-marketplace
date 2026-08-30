"use client";
import { useEffect, useState } from "react";
import { Search, Trash2, CheckCircle, XCircle, Eye, Clock, AlertTriangle, Ban, Star, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatPrice, formatDate } from "@/lib/utils";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/listings")
      .then(r => r.json())
      .then(d => setListings(d?.listings || []))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string, note?: string) => {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: note }),
      });
      if (res.ok) {
        toast(`Listing ${status.toLowerCase()}`, "success");
        setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update", "error");
      }
    } catch {
      toast("Failed to update listing", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const removeListing = async (id: string) => {
    if (!confirm("Permanently remove this listing?")) return;
    setActionLoading(id + "DELETE");
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Listing removed", "success");
        setListings(prev => prev.filter(l => l.id !== id));
      }
    } catch {
      toast("Failed to remove listing", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.owner?.firstName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter.toUpperCase();
    const matchMarketplace = marketplaceFilter === "all" || l.marketplace?.name === marketplaceFilter;
    return matchSearch && matchStatus && matchMarketplace;
  });

  const statusColors: Record<string, string> = {
    ACTIVE: "success",
    DRAFT: "default",
    UPCOMING: "warning",
    UNAVAILABLE: "danger",
    DELETED: "danger",
  };

  const statusCounts = {
    all: listings.length,
    ACTIVE: listings.filter(l => l.status === "ACTIVE").length,
    DRAFT: listings.filter(l => l.status === "DRAFT").length,
    UPCOMING: listings.filter(l => l.status === "UPCOMING").length,
    UNAVAILABLE: listings.filter(l => l.status === "UNAVAILABLE").length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Listings</h1>
          <p className="text-slate-500 text-sm mt-1">{listings.length} total listings · {statusCounts.ACTIVE} active · {statusCounts.DRAFT} drafts</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(["all", "ACTIVE", "DRAFT", "UPCOMING", "UNAVAILABLE"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === f
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">({statusCounts[f]})</span>
          </button>
        ))}
      </div>

      {/* Search and Marketplace Filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, owner name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm"
          />
        </div>
        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="all">All Marketplaces</option>
          <option value="House Rental">House Rental</option>
          <option value="Plot Selling VIP">Plot Selling VIP</option>
        </select>
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
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Views</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No listings found</td></tr>
                ) : filtered.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 max-w-[200px] truncate">{l.title}</div>
                      <div className="text-xs text-slate-400">{l.locationDistrict}{l.locationSector ? `, ${l.locationSector}` : ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{l.owner?.firstName} {l.owner?.lastName}</div>
                      <div className="text-xs text-slate-400">{l.owner?.email}</div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{l.marketplace?.displayName}</Badge></td>
                    <td className="px-4 py-3 font-medium">{formatPrice(l.price)}</td>
                    <td className="px-4 py-3 text-slate-500">{l.viewCount || 0}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColors[l.status] as any || "default"}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {l.status !== "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => updateStatus(l.id, "ACTIVE")}
                            disabled={actionLoading === l.id + "ACTIVE"}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {l.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => updateStatus(l.id, "UNAVAILABLE")}
                            disabled={actionLoading === l.id + "UNAVAILABLE"}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeListing(l.id)}
                          disabled={actionLoading === l.id + "DELETE"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
