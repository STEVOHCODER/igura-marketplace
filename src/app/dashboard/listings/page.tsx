"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, Plus, Edit, Trash2, Eye, EyeOff, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchListings = () => {
    fetch("/api/properties?limit=100&myListings=true")
      .then(r => r.json())
      .then(d => setListings(d?.properties || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchListings(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This will also remove all images permanently.`)) return;
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Listing deleted", "success");
        fetchListings();
      } else {
        toast("Failed to delete listing", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast("Status updated", "success");
        fetchListings();
      }
    } catch {
      toast("Something went wrong", "error");
    }
  };

  const statusColors: Record<string, "success" | "warning" | "danger" | "default"> = {
    ACTIVE: "success",
    DRAFT: "default",
    UPCOMING: "warning",
    UNAVAILABLE: "danger",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
          <p className="text-slate-500 mt-1">{listings.length} total listings</p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Listing</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Home className="h-12 w-12" />}
          title="No listings yet"
          description="Create your first property listing to get started."
          action={<Link href="/dashboard/listings/new"><Button>Create Listing</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                {listing.images?.[0] ? (
                  <img src={listing.images[0].url} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-300">
                    <Home className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900 truncate">{listing.title}</h3>
                  <Badge variant={statusColors[listing.status] || "default"}>{listing.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {formatPrice(listing.price)} • {availabilityLabel(listing.availabilityStatus, listing.availabilityDate)}
                </p>
                <p className="text-xs text-slate-400 mt-1">{listing.locationDistrict}, {listing.locationSector}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/listings/${listing.id}/edit`}>
                  <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(listing.id, listing.status === "ACTIVE" ? "UNAVAILABLE" : "ACTIVE")}
                >
                  {listing.status === "ACTIVE" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(listing.id, listing.title)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
