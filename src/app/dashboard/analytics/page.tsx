"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, Home, TrendingUp, Calendar, Pencil, Trash2, Power, PowerOff, Plus, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

type StatusFilter = "ALL" | "ACTIVE" | "DRAFT" | "UPCOMING" | "UNAVAILABLE";

const STATUS_TABS: { key: StatusFilter; label: string; color: string }[] = [
  { key: "ALL", label: "All", color: "bg-slate-100 text-slate-700" },
  { key: "ACTIVE", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { key: "DRAFT", label: "Draft", color: "bg-amber-100 text-amber-700" },
  { key: "UNAVAILABLE", label: "Unavailable", color: "bg-red-100 text-red-700" },
];

const STATUS_BADGE: Record<string, "success" | "warning" | "danger" | "default"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  UPCOMING: "warning",
  UNAVAILABLE: "danger",
};

interface Listing {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  revealCount: number;
  price: number;
  marketplace: string;
  image: string | null;
  createdAt: string;
}

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusFilter>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load initial data from analytics API (has correct shape with revealCount, image, marketplace string)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dashboard/analytics")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setStats(d.stats);
        setMembership(d.membership);
        setListings(d.listings || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch listings when tab changes (except ALL which uses analytics data)
  const fetchByStatus = useCallback(async (status: StatusFilter) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (status === "ALL") {
      // Reload from analytics API (has all statuses, correct shape)
      try {
        const res = await fetch("/api/dashboard/analytics", { signal: controller.signal });
        const d = await res.json();
        if (!controller.signal.aborted) {
          setStats(d.stats);
          setListings(d.listings || []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      }
      return;
    }

    // Single status: use properties API
    try {
      const res = await fetch(`/api/properties?limit=100&myListings=true&statusFilter=${status}`, { signal: controller.signal });
      const d = await res.json();
      if (!controller.signal.aborted) {
        const mapped: Listing[] = (d.properties || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          viewCount: p.viewCount || 0,
          revealCount: 0,
          price: p.price,
          marketplace: p.marketplace?.displayName || p.marketplace?.name || "",
          image: p.images?.[0]?.url || null,
          createdAt: p.createdAt,
        }));
        setListings(mapped);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchByStatus(activeTab);
    }
  }, [activeTab, loading, fetchByStatus]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleStatusToggle = async (listing: Listing) => {
    const newStatus = listing.status === "ACTIVE" ? "UNAVAILABLE" : "ACTIVE";
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/properties/${listing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Update locally instead of re-fetching
        setListings(prev => prev.map(l =>
          l.id === listing.id ? { ...l, status: newStatus } : l
        ).filter(l => activeTab === "ALL" || l.status === activeTab));
        // Update stats
        setStats((prev: any) => {
          if (!prev) return prev;
          const wasActive = listing.status === "ACTIVE";
          const nowActive = newStatus === "ACTIVE";
          return {
            ...prev,
            activeListings: prev.activeListings + (nowActive ? 1 : wasActive ? -1 : 0),
          };
        });
      }
    } catch (e) {
      console.error("Failed to toggle status:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (listing: Listing) => {
    if (!confirm(`Delete "${listing.title}"? This cannot be undone.`)) return;
    setActionLoading(listing.id);
    try {
      const res = await fetch(`/api/properties/${listing.id}`, { method: "DELETE" });
      if (res.ok) {
        setListings(prev => prev.filter(l => l.id !== listing.id));
        setStats((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalListings: prev.totalListings - 1,
            activeListings: prev.activeListings - (listing.status === "ACTIVE" ? 1 : 0),
            totalViews: prev.totalViews - listing.viewCount,
          };
        });
      }
    } catch (e) {
      console.error("Failed to delete listing:", e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            Failed to load analytics
          </CardContent>
        </Card>
      </div>
    );
  }

  // Derive filtered count for tab label
  const filteredCount = activeTab === "ALL"
    ? listings.length
    : listings.filter(l => l.status === activeTab).length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h1>
        <Link href="/dashboard/listings/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-1" /> New Listing
          </Button>
        </Link>
      </div>
      <p className="text-slate-500 mb-6">Track your listing performance and manage listings</p>

      {/* Membership Info */}
      {membership && (
        <Card className="mb-6 border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-emerald-800">{membership.plan} Plan — {membership.marketplace}</p>
                <p className="text-sm text-emerald-600">{membership.maxListings} max listings</p>
              </div>
              {membership.expiresAt && (
                <p className="text-sm text-emerald-600">
                  Expires {new Date(membership.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalReveals}</p>
                <p className="text-xs text-slate-500">Contact Reveals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Home className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.activeListings}</p>
                <p className="text-xs text-slate-500">Active Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalListings}</p>
                <p className="text-xs text-slate-500">Total Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white"
                : tab.color + " hover:opacity-80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Listings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Listings ({filteredCount})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">
                {activeTab === "ALL" ? "No listings yet" : `No ${activeTab.toLowerCase()} listings`}
              </p>
              <Link href="/dashboard/listings/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-1" /> Create Your First Listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Listing</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Marketplace</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Price</th>
                    <th className="text-center py-3 px-2 font-medium text-slate-600">Views</th>
                    <th className="text-center py-3 px-2 font-medium text-slate-600">Reveals</th>
                    <th className="text-center py-3 px-2 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-slate-600">Created</th>
                    <th className="text-center py-3 px-2 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings
                    .filter(l => activeTab === "ALL" || l.status === activeTab)
                    .map((l) => (
                    <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          {l.image ? (
                            <Image src={l.image} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Home className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <span className="font-medium text-slate-900 truncate max-w-[200px]">{l.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-600">{l.marketplace}</td>
                      <td className="py-3 px-2 text-slate-600">{formatPrice(l.price)}/mo</td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                          <Eye className="h-3.5 w-3.5" /> {l.viewCount}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Phone className="h-3.5 w-3.5" /> {l.revealCount}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <Badge variant={STATUS_BADGE[l.status] || "default"}>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(l.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center justify-center gap-1">
                          {actionLoading === l.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                          ) : (
                            <>
                              <Link
                                href={`/dashboard/listings/${l.id}/edit`}
                                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
                                title="Edit listing"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleStatusToggle(l)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  l.status === "ACTIVE"
                                    ? "hover:bg-red-100 text-emerald-600"
                                    : "hover:bg-emerald-100 text-slate-400"
                                }`}
                                title={l.status === "ACTIVE" ? "Disable (hide from search)" : "Enable (show in search)"}
                              >
                                {l.status === "ACTIVE" ? (
                                  <Power className="h-4 w-4" />
                                ) : (
                                  <PowerOff className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(l)}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
                                title="Delete listing"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info banner */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>How status affects visibility:</strong> Only <span className="font-semibold">ACTIVE</span> listings appear in public search.
          Disabling a listing hides it from buyers but keeps your data.
          Deleted listings cannot be recovered.
        </p>
      </div>
    </div>
  );
}
