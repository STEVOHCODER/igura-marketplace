"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", price: "", negotiable: true,
    availabilityStatus: "AVAILABLE", availabilityDate: "",
    bedrooms: "", bathrooms: "", areaValue: "",
    contactPhone: "", contactName: "",
    locationCountry: "Rwanda", locationDistrict: "", locationSector: "",
    locationCell: "", locationVillage: "",
    latitude: "", longitude: "", coordinatesRevealed: false,
    keywords: [] as string[], keywordInput: "", status: "ACTIVE",
  });
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/properties/${id}`)
      .then(r => r.json())
      .then(d => {
        const p = d?.property;
        if (!p) { toast("Listing not found", "error"); return; }
        setForm({
          title: p.title || "", description: p.description || "",
          price: p.price?.toString() || "", negotiable: p.negotiable ?? true,
          availabilityStatus: p.availabilityStatus || "AVAILABLE",
          availabilityDate: p.availabilityDate ? new Date(p.availabilityDate).toISOString().split("T")[0] : "",
          bedrooms: p.bedrooms?.toString() || "", bathrooms: p.bathrooms?.toString() || "",
          areaValue: p.areaValue?.toString() || "", contactPhone: p.contactPhone || "",
          contactName: p.contactName || "", locationCountry: p.locationCountry || "Rwanda",
          locationDistrict: p.locationDistrict || "", locationSector: p.locationSector || "",
          locationCell: p.locationCell || "", locationVillage: p.locationVillage || "",
          latitude: p.latitude?.toString() || "", longitude: p.longitude?.toString() || "",
          coordinatesRevealed: p.coordinatesRevealed ?? false,
          keywords: p.keywords?.map((k: any) => k.keyword) || [],
          keywordInput: "", status: p.status || "ACTIVE",
        });
        setExistingImages(p.images || []);
      })
      .catch(() => toast("Failed to load listing", "error"))
      .finally(() => setLoading(false));
  }, [id]);

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const addKeyword = () => {
    if (form.keywordInput.trim() && form.keywords.length < 10) {
      updateForm("keywords", [...form.keywords, form.keywordInput.trim().toLowerCase()]);
      updateForm("keywordInput", "");
    }
  };

  const removeKeyword = (kw: string) => updateForm("keywords", form.keywords.filter(k => k !== kw));

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        title: form.title, description: form.description,
        price: parseInt(form.price) || 0, negotiable: form.negotiable,
        availabilityStatus: form.availabilityStatus,
        availabilityDate: form.availabilityDate || undefined,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        areaValue: form.areaValue ? parseFloat(form.areaValue) : undefined,
        contactPhone: form.contactPhone, contactName: form.contactName,
        locationCountry: form.locationCountry, locationDistrict: form.locationDistrict,
        locationSector: form.locationSector, locationCell: form.locationCell,
        locationVillage: form.locationVillage,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        coordinatesRevealed: form.coordinatesRevealed,
        keywords: form.keywords, status: form.status,
      };

      const res = await fetch(`/api/properties/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast(d.error || "Failed to save", "error"); return; }

      for (let i = 0; i < newImages.length; i++) {
        const fd = new FormData();
        fd.append("file", newImages[i]);
        fd.append("sortOrder", (existingImages.length + i).toString());
        await fetch(`/api/properties/${id}/images`, { method: "POST", body: fd });
      }

      toast("Listing updated!", "success");
      router.push("/dashboard/listings");
    } catch { toast("Something went wrong", "error"); }
    finally { setSaving(false); }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/properties/${id}/images?imageId=${imageId}`, { method: "DELETE" });
      if (res.ok) { setExistingImages(prev => prev.filter(i => i.id !== imageId)); toast("Image removed", "success"); }
    } catch { toast("Failed to remove image", "error"); }
  };

  const handleNewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const total = existingImages.length + newImages.length + files.length;
    if (total > 3) { toast("Maximum 3 images", "error"); return; }
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024 && ["image/jpeg","image/png","image/webp"].includes(f.type));
    setNewImages(prev => [...prev, ...valid].slice(0, 3));
    setNewPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeNewImage = (idx: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const districts = ["Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare","Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera"];

  if (loading) return <div className="max-w-3xl mx-auto"><div className="animate-pulse h-96 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to listings
      </button>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Listing</h1>

      <div className="space-y-6">
        <Card><CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Basic Details</h2>
          <Input label="Title" value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Price (RWF/month)" type="number" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Negotiable</label>
              <div className="flex gap-2 mt-2">
                <button onClick={() => updateForm("negotiable", true)} className={`px-4 py-2 rounded-lg text-sm ${form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>Yes</button>
                <button onClick={() => updateForm("negotiable", false)} className={`px-4 py-2 rounded-lg text-sm ${!form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>No</button>
              </div></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Bedrooms" type="number" value={form.bedrooms} onChange={(e) => updateForm("bedrooms", e.target.value)} />
            <Input label="Bathrooms" type="number" value={form.bathrooms} onChange={(e) => updateForm("bathrooms", e.target.value)} />
            <Input label="Area (m²)" type="number" value={form.areaValue} onChange={(e) => updateForm("areaValue", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Name" value={form.contactName} onChange={(e) => updateForm("contactName", e.target.value)} />
            <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => updateForm("contactPhone", e.target.value)} />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Availability</h2>
          <select value={form.availabilityStatus} onChange={(e) => updateForm("availabilityStatus", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="AVAILABLE">Available Now</option>
            <option value="UPCOMING">Coming Soon</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>
          {form.availabilityStatus === "UPCOMING" && <Input label="Available From" type="date" value={form.availabilityDate} onChange={(e) => updateForm("availabilityDate", e.target.value)} />}
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Images</h2>
          <div className="grid grid-cols-3 gap-3">
            {existingImages.map((img: any) => (
              <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <button onClick={() => deleteImage(img.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {newPreviews.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button onClick={() => removeNewImage(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {existingImages.length + newImages.length < 3 && (
              <label className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400">
                <Upload className="h-6 w-6 text-slate-400" /><span className="text-xs text-slate-400 mt-1">Add</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleNewImages} className="hidden" />
              </label>
            )}
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Location</h2>
          <select value={form.locationDistrict} onChange={(e) => updateForm("locationDistrict", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">Select district</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Sector" value={form.locationSector} onChange={(e) => updateForm("locationSector", e.target.value)} />
            <Input label="Cell" value={form.locationCell} onChange={(e) => updateForm("locationCell", e.target.value)} />
            <Input label="Village" value={form.locationVillage} onChange={(e) => updateForm("locationVillage", e.target.value)} />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Keywords</h2>
          <div className="flex gap-2">
            <Input value={form.keywordInput} onChange={(e) => updateForm("keywordInput", e.target.value)} placeholder="Add keyword..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
            <Button onClick={addKeyword} type="button" size="sm">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm">{kw}<button onClick={() => removeKeyword(kw)} className="hover:text-red-600"><X className="h-3 w-3" /></button></span>
            ))}
          </div>
        </CardContent></Card>

        <div className="flex gap-3 justify-end pb-8">
          <Button variant="outline" onClick={() => router.push("/dashboard/listings")}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4 mr-2" />Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
