"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * Create a listing on behalf of a commissionaire.
 *
 * Built for the launch workflow: an agent sends their property details and
 * photos over WhatsApp, and the site owner types them in here rather than
 * training the agent on the dashboard. The listing is created with the
 * commissionaire as owner - not the admin - so it appears on their public
 * profile and counts against their quota.
 *
 * The submit sequence mirrors the lister form exactly (create, upload photos,
 * upload video, publish) because the server refuses to publish a listing with no
 * photos.
 */
export default function AdminNewListingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [owners, setOwners] = useState<any[]>([]);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    marketplace: "House Rental",
    title: "",
    description: "",
    propertyTypeId: "",
    price: "",
    negotiable: true,
    contactName: "",
    contactPhone: "",
    locationDistrict: "",
    locationSector: "",
    locationCell: "",
    locationVillage: "",
    bedrooms: "",
    bathrooms: "",
    areaValue: "",
    areaUnit: "SQM",
    keywords: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => setOwners(d?.users || []))
      .catch(() => toast("Could not load the owner list", "error"))
      .finally(() => setLoadingOwners(false));

    fetch("/api/property-types")
      .then((r) => r.json())
      .then((d) => setPropertyTypes(d?.propertyTypes || d?.types || []))
      .catch(() => {});
  }, [toast]);

  /** Only accounts that can legitimately own a listing. */
  const ownerOptions = useMemo(
    () =>
      owners.filter(
        (u) =>
          u.isActive !== false &&
          ["USER", "CLIENT", "COMMISSIONAIRE"].includes(u.role) &&
          `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(ownerQuery.toLowerCase())
      ),
    [owners, ownerQuery]
  );

  const selectedOwner = owners.find((u) => u.id === ownerId);
  const typesForMarketplace = useMemo(() => {
    const target = form.marketplace;
    return propertyTypes.filter(
      (t) => t.marketplace?.name === target || t.marketplace?.displayName === target || !t.marketplace
    );
  }, [propertyTypes, form.marketplace]);

  // A property type from another marketplace would be rejected server-side, so
  // clear it when the marketplace changes.
  useEffect(() => {
    setForm((f) => ({ ...f, propertyTypeId: "" }));
  }, [form.marketplace]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  function addImages(list: FileList | null) {
    if (!list) return;
    const next = [...images, ...Array.from(list)].slice(0, 3);
    setImages(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!ownerId) { toast("Choose who this listing belongs to", "error"); return; }
    if (form.title.trim().length < 5) { toast("Title is required (at least 5 characters)", "error"); return; }
    if (form.description.trim().length < 20) { toast("Description is required (at least 20 characters)", "error"); return; }
    if (!form.propertyTypeId) { toast("Property type is required", "error"); return; }
    if (!form.price || parseInt(form.price) <= 0) { toast("Valid price is required", "error"); return; }
    if (!form.contactPhone.trim()) { toast("Contact phone is required", "error"); return; }
    if (!form.locationDistrict.trim()) { toast("District is required", "error"); return; }
    if (images.length < 1) { toast("Add at least one photo", "error"); return; }

    setSubmitting(true);
    try {
      const body: Record<string, any> = {
        ...form,
        ownerId,
        price: parseInt(form.price),
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        areaValue: form.areaValue ? parseFloat(form.areaValue) : undefined,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not create the listing", "error");
        return;
      }

      const propertyId = data.property.id;

      let imageFailed = false;
      for (let i = 0; i < images.length; i++) {
        const fd = new FormData();
        fd.append("file", images[i]);
        fd.append("sortOrder", i.toString());
        const r = await fetch(`/api/properties/${propertyId}/images`, { method: "POST", body: fd });
        if (!r.ok) imageFailed = true;
      }

      if (video) {
        const fd = new FormData();
        fd.append("file", video);
        const r = await fetch(`/api/properties/${propertyId}/video`, { method: "POST", body: fd });
        if (!r.ok) toast("The video could not be uploaded, the listing was still created", "error");
      }

      const pub = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (!pub.ok) {
        const e2 = await pub.json().catch(() => ({}));
        toast(e2.error || "Created but not published", "error");
        router.push(`/admin/listings`);
        return;
      }

      const who = `${selectedOwner?.firstName || ""} ${selectedOwner?.lastName || ""}`.trim();
      toast(
        imageFailed
          ? `Published for ${who}, but some photos failed to upload`
          : `Published for ${who}`,
        imageFailed ? "error" : "success"
      );
      router.push("/admin/listings");
    } catch {
      toast("Could not create the listing", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelCls = "block text-sm font-medium text-[#1c1917]";

  return (
    <div className="max-w-3xl">
      <Link href="/admin/listings" className="inline-flex items-center gap-1 text-sm text-[#6b625b] hover:text-[#047857]">
        <ArrowLeft className="h-4 w-4" /> Back to listings
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[#1c1917]">Add a listing for a client</h1>
      <p className="mt-1 text-sm text-[#6b625b]">
        The listing is published under the owner you choose, so it appears on their public profile and
        counts against their own quota.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        {/* Owner picker */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
            <UserPlus className="h-4 w-4 text-[#047857]" /> Who owns this listing?
          </h2>
          {loadingOwners ? (
            <p className="mt-3 text-sm text-[#6b625b]">Loading accounts…</p>
          ) : (
            <>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a8a29e]" />
                <label className="sr-only" htmlFor="owner-search">Search accounts</label>
                <input
                  id="owner-search"
                  value={ownerQuery}
                  onChange={(e) => setOwnerQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <label className="sr-only" htmlFor="owner-select">Select owner</label>
              <select
                id="owner-select"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Choose an account…</option>
                {ownerOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} — {u.email}
                    {u.role === "COMMISSIONAIRE" ? " (commissionaire)" : ""}
                  </option>
                ))}
              </select>
              {ownerQuery && ownerOptions.length === 0 && (
                <p className="mt-2 text-xs text-[#b45309]">
                  No match. Create the account first under Admin → Users, then come back.
                </p>
              )}
              {selectedOwner && (
                <p className="mt-2 text-xs text-[#047857]">
                  This will be published for {selectedOwner.firstName} {selectedOwner.lastName}.
                </p>
              )}
            </>
          )}
        </section>

        {/* Property */}
        <section className="space-y-4 rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5">
          <h2 className="text-lg font-bold text-[#1c1917]">Property</h2>
          <label className={labelCls}>
            Marketplace
            <select value={form.marketplace} onChange={(e) => set("marketplace", e.target.value)} className={inputCls}>
              <option value="House Rental">Rent a House</option>
              <option value="Buy Land">Buy Land</option>
              <option value="Buy a House">Buy a House</option>
              <option value="House Rental">House Rental</option>
              <option value="Plot Selling VIP">Plot Selling VIP</option>
              <option value="House Selling VVIP">House Selling VVIP</option>
            </select>
          </label>
          <label className={labelCls}>
            Title
            <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} className={inputCls} />
          </label>
          <label className={labelCls}>
            Description
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} maxLength={4000} className={inputCls} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Property type
              <select value={form.propertyTypeId} onChange={(e) => set("propertyTypeId", e.target.value)} className={inputCls}>
                <option value="">Choose…</option>
                {typesForMarketplace.map((t) => (
                  <option key={t.id} value={t.id}>{t.displayName || t.name}</option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Price (RWF)
              <input value={form.price} onChange={(e) => set("price", e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.negotiable} onChange={(e) => set("negotiable", e.target.checked)} />
            Price is negotiable
          </label>
          <label className={labelCls}>
            Keywords
            <input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder="Comma separated" className={inputCls} />
          </label>
        </section>

        {/* Location */}
        <section className="space-y-4 rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5">
          <h2 className="text-lg font-bold text-[#1c1917]">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              District <span className="text-red-600">*</span>
              <input value={form.locationDistrict} onChange={(e) => set("locationDistrict", e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Sector
              <input value={form.locationSector} onChange={(e) => set("locationSector", e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Cell
              <input value={form.locationCell} onChange={(e) => set("locationCell", e.target.value)} className={inputCls} />
            </label>
            <label className={labelCls}>
              Village
              <input value={form.locationVillage} onChange={(e) => set("locationVillage", e.target.value)} className={inputCls} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelCls}>
              Bedrooms
              <input value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            <label className={labelCls}>
              Bathrooms
              <input value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} inputMode="numeric" className={inputCls} />
            </label>
            <label className={labelCls}>
              Area
              <div className="flex gap-2">
                <input value={form.areaValue} onChange={(e) => set("areaValue", e.target.value)} inputMode="decimal" className={inputCls} />
                <select value={form.areaUnit} onChange={(e) => set("areaUnit", e.target.value)} className="rounded-xl border border-[#d6ccbf] bg-white px-2 text-sm">
                  <option value="SQM">m²</option>
                  <option value="ACRE">acre</option>
                  <option value="HECTARE">ha</option>
                </select>
              </div>
            </label>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-4 rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5">
          <h2 className="text-lg font-bold text-[#1c1917]">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Contact name
              <input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Defaults to the owner's name" className={inputCls} />
            </label>
            <label className={labelCls}>
              Contact phone <span className="text-red-600">*</span>
              <input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="tel" placeholder="+250 7XX XXX XXX" className={inputCls} />
            </label>
          </div>
        </section>

        {/* Media */}
        <section className="space-y-4 rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5">
          <h2 className="text-lg font-bold text-[#1c1917]">Photos &amp; video</h2>
          <p className="text-xs text-[#6b625b]">
            At least one photo is required to publish. Images are compressed to WebP automatically.
          </p>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">Photos ({images.length}/3)</span>
            <input type="file" accept="image/*" multiple onChange={(e) => addImages(e.target.files)} className="mt-1 w-full text-sm" />
          </label>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(img)} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, x) => x !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-sm shadow"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">Video (optional)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => setVideo(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
          </label>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Publishing…" : "Publish listing"}
          </Button>
          <Link href="/admin/listings" className="text-sm text-[#6b625b] hover:underline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
