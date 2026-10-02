"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Home, Plus, Edit, Trash2, Eye, EyeOff, MoreVertical, Phone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice, availabilityLabel } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PropertyGallery } from "@/components/ui/property-gallery";
import { useI18n } from "@/i18n";

export default function ListingsPage() {
  const { t } = useI18n();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<{ activeListings: number; maxActiveListings: number; canPublish: boolean; reason: string | null } | null>(null);
  // Photos the lister has uploaded, opened in the shared gallery lightbox.
  const [preview, setPreview] = useState<{ url: string; title: string; all: { url: string; altText?: string | null }[] } | null>(null);
  const { toast } = useToast();

  const fetchListings = () => {
    // limit is capped at 50 by searchSchema. Asking for 100 made this return 400,
// and because the response had no `properties` key the table rendered "0 total
// listings" while /api/access/quota - a separate call - still reported the real
// count, which is why the two disagreed on screen.
fetch("/api/properties?limit=50&myListings=true&statusFilter=ALL")
      .then(r => r.json())
      .then(d => setListings(d?.properties || []))
      .finally(() => setLoading(false));
    fetch("/api/access/quota")
      .then(r => r.json())
      .then(d => {
        if (typeof d?.activeListings === "number") setQuota(d);
      })
      .catch(() => {});
  };

  const refreshQuota = () => {
    fetch("/api/access/quota")
      .then(r => r.json())
      .then(d => {
        if (typeof d?.activeListings === "number") setQuota(d);
      })
      .catch(() => {});
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
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Status update failed", "error");
        refreshQuota();
      }
    } catch {
      toast("Something went wrong", "error");
    }
  };

  const handleRevealContact = async (propertyId: string) => {
    try {
      const res = await fetch("/api/payments/reveal-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, method: "mobile_money" }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.pending && data.reference) {
        toast(data.message || "Payment request sent. Approve on your phone, then check again.", "success");
        return;
      }
      if (data.revealed || data.success) {
        toast("Contact revealed!", "success");
        fetchListings();
      } else {
        toast(data.error || "Payment failed", "error");
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
          <h1 className="text-2xl font-bold text-[#1c1917]">{t("listings.title")}</h1>
          <p className="text-[#6b625b] mt-1">{listings.length} {t("listings.total")}</p>
        </div>
        <Link href="/dashboard/listings/new">
          <Button><Plus className="h-4 w-4 mr-2" />{t("listings.newListing")}</Button>
        </Link>
      </div>

      {/* Quota banner: every submitted listing is published, so each one takes a slot */}
      {quota && (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${quota.canPublish ? "bg-[#faf8f4] border-[#e8e1d8] text-[#6b625b]" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          {quota.canPublish ? (
            <p>{quota.activeListings} of {quota.maxActiveListings} listings used. Every listing you submit goes live straight away.</p>
          ) : (
            <p className="font-medium">{quota.reason || "Listing limit reached."} Unpublish a listing to free a slot.</p>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<Home className="h-12 w-12" />}
          title={t("listings.noListings")}
          description={t("listings.noListingsDesc")}
          action={<Link href="/dashboard/listings/new"><Button>{t("listings.createListing")}</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-[#fffdfb] rounded-[18px] border border-[#e8e1d8] p-4 flex items-center gap-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_2px_8px_-2px_rgba(28,25,23,0.07)]">
              {/* Clicking a lister's own photo opens it, so they can check what
                  they actually uploaded without leaving the dashboard. */}
              {listing.images?.[0] ? (
                <button
                  type="button"
                  onClick={() => setPreview({
                    url: listing.images[0].url,
                    title: listing.title,
                    all: (listing.images || []).map((im: any) => ({ url: im.url, altText: im.altText })),
                  })}
                  aria-label={`Preview photos for ${listing.title}`}
                  className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#f2ede6] ring-1 ring-[#e8e1d8] transition-transform hover:scale-[1.04]"
                >
                  <Image src={listing.images[0].url} alt={listing.title} width={80} height={80} className="h-full w-full object-cover" />
                  {(listing.images || []).length > 1 && (
                    <span className="absolute bottom-0 right-0 rounded-tl-lg bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      +{listing.images.length - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="h-20 w-20 rounded-xl bg-[#f2ede6] overflow-hidden flex-shrink-0 ring-1 ring-[#e8e1d8] flex items-center justify-center text-[#d6ccbf]">
                  <Home className="h-6 w-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[#1c1917] truncate">{listing.title}</h3>
                  <Badge variant={statusColors[listing.status] || "default"}>{listing.status}</Badge>
                </div>
                <p className="text-sm text-[#6b625b] mt-1">
                  {formatPrice(listing.price)} • {availabilityLabel(listing.availabilityStatus, listing.availabilityDate)}
                </p>
                <p className="text-xs text-[#a8a29e] mt-1">{listing.locationDistrict}, {listing.locationSector}</p>
              </div>
              <div className="flex items-center gap-2">
                {listing.contactRevealed ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#047857] bg-[#ecfdf5] px-2 py-1 rounded-full">
                    <Phone className="h-3 w-3" /> Contact Visible
                  </span>
                ) : (
                  <button
                    onClick={() => handleRevealContact(listing.id)}
                    className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full hover:bg-[#fef3c7] transition-colors cursor-pointer"
                    title="Pay 2,000 RWF to reveal your contact number"
                  >
                    <Lock className="h-3 w-3" /> Reveal Contact
                  </button>
                )}
                <Link href={`/dashboard/listings/${listing.id}/edit`}>
                  <Button variant="outline" size="sm"><Edit className="h-4 w-4" /></Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={listing.status !== "ACTIVE" && quota !== null && !quota.canPublish}
                  title={listing.status !== "ACTIVE" && quota !== null && !quota.canPublish ? (quota.reason || "Listing limit reached") : (listing.status === "ACTIVE" ? "Unpublish" : "Publish")}
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

      {preview && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#faf8f4]">
          <div className="mx-auto max-w-3xl px-4 py-6">
            <p className="mb-4 text-sm text-[#6b625b]">Photos on &ldquo;{preview.title}&rdquo;</p>
            <PropertyGallery
              images={preview.all.length > 0 ? preview.all : [{ url: preview.url }]}
              title={preview.title}
            />
            <div className="mt-5">
              <Button variant="outline" onClick={() => setPreview(null)}>Close preview</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
