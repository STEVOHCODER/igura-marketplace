"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, X, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const STEPS = ["Type", "Images", "Details", "Location", "Coordinates", "Keywords", "Preview"];

export default function NewListingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [form, setForm] = useState({
    marketplace: "",
    propertyTypeId: "",
    title: "",
    description: "",
    price: "",
    negotiable: true,
    availabilityStatus: "AVAILABLE",
    availabilityDate: "",
    bedrooms: "",
    bathrooms: "",
    areaValue: "",
    contactPhone: "",
    contactName: "",
    locationCountry: "Rwanda",
    locationDistrict: "",
    locationSector: "",
    locationCell: "",
    locationVillage: "",
    latitude: "",
    longitude: "",
    coordinatesRevealed: false,
    keywords: [] as string[],
    keywordInput: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/property-types").then(r => r.json()).then(d => setPropertyTypes(d?.types || []));
  }, []);

  const updateForm = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const addKeyword = () => {
    if (form.keywordInput.trim() && form.keywords.length < 10) {
      updateForm("keywords", [...form.keywords, form.keywordInput.trim().toLowerCase()]);
      updateForm("keywordInput", "");
    }
  };

  const removeKeyword = (kw: string) => {
    updateForm("keywords", form.keywords.filter(k => k !== kw));
  };

  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 3) {
      toast("Maximum 3 images allowed", "error");
      return;
    }
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name} is too large (max 5MB)`, "error"); return false; }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast(`${f.name} is not a supported format`, "error"); return false; }
      return true;
    });
    const newImages = [...images, ...validFiles].slice(0, 3);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setImagePreviews(newImages.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const body = {
        ...form,
        price: parseInt(form.price),
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        areaValue: form.areaValue ? parseFloat(form.areaValue) : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        availabilityDate: form.availabilityDate || undefined,
      };
      delete (body as any).keywordInput;

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Failed to create listing", "error"); return; }

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const fd = new FormData();
        fd.append("file", images[i]);
        fd.append("sortOrder", i.toString());
        await fetch(`/api/properties/${data.property.id}/images`, { method: "POST", body: fd });
      }

      toast("Listing created successfully!", "success");
      router.push("/dashboard/listings");
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const districts = ["Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare","Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera"];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Listing</h1>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${i <= step ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "text-emerald-600 font-medium" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-emerald-600" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 0: Marketplace & Type */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Select Marketplace & Property Type</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Marketplace</label>
                <div className="grid grid-cols-2 gap-3">
                  {["house_rental", "plot_sale"].map((m) => (
                    <button key={m} onClick={() => updateForm("marketplace", m)} className={`p-4 rounded-xl border-2 text-left transition-all ${form.marketplace === m ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <p className="font-medium">{m === "house_rental" ? "House Rental" : "Plot Selling (VIP)"}</p>
                      <p className="text-sm text-slate-500 mt-1">{m === "house_rental" ? "Rent houses" : "Sell plots"}</p>
                    </button>
                  ))}
                </div>
              </div>
              {form.marketplace && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Property Type</label>
                  <select value={form.propertyTypeId} onChange={(e) => updateForm("propertyTypeId", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">Select type</option>
                    {propertyTypes.filter((t: any) => t.marketplaceId === form.marketplace || true).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.displayName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Images */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Property Images</h2>
              <p className="text-sm text-slate-500">Upload up to 3 images. First image will be the main photo.</p>
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={preview} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Add Image</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageAdd} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Property Details</h2>
              <Input label="Title" placeholder="e.g. Spacious Room + Salon in Kacyiru" value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder="Describe the property..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Price (RWF/month)" type="number" placeholder="e.g. 50000" value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Negotiable</label>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => updateForm("negotiable", true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>Negotiable</button>
                    <button onClick={() => updateForm("negotiable", false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${!form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>Fixed Price</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Bedrooms" type="number" value={form.bedrooms} onChange={(e) => updateForm("bedrooms", e.target.value)} />
                <Input label="Bathrooms" type="number" value={form.bathrooms} onChange={(e) => updateForm("bathrooms", e.target.value)} />
                <Input label="Area (m²)" type="number" value={form.areaValue} onChange={(e) => updateForm("areaValue", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Your Name" value={form.contactName} onChange={(e) => updateForm("contactName", e.target.value)} placeholder="Name for contact" />
                <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => updateForm("contactPhone", e.target.value)} placeholder="07XXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                <select value={form.availabilityStatus} onChange={(e) => updateForm("availabilityStatus", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="AVAILABLE">Available Now</option>
                  <option value="UPCOMING">Available on a specific date</option>
                  <option value="UNAVAILABLE">Unavailable</option>
                </select>
              </div>
              {form.availabilityStatus === "UPCOMING" && (
                <Input label="Available From" type="date" value={form.availabilityDate} onChange={(e) => updateForm("availabilityDate", e.target.value)} />
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Location</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                <select value={form.locationDistrict} onChange={(e) => updateForm("locationDistrict", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">Select district</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <Input label="Sector" value={form.locationSector} onChange={(e) => updateForm("locationSector", e.target.value)} placeholder="e.g. Kacyiru" />
              <Input label="Cell" value={form.locationCell} onChange={(e) => updateForm("locationCell", e.target.value)} placeholder="e.g. Kamatamu" />
              <Input label="Village" value={form.locationVillage} onChange={(e) => updateForm("locationVillage", e.target.value)} placeholder="e.g. Ukwezi" />
            </div>
          )}

          {/* Step 4: Coordinates */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">GPS Coordinates</h2>
              <p className="text-sm text-slate-500">Optional. Help clients find the exact location.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" type="number" step="any" value={form.latitude} onChange={(e) => updateForm("latitude", e.target.value)} placeholder="-1.9403" />
                <Input label="Longitude" type="number" step="any" value={form.longitude} onChange={(e) => updateForm("longitude", e.target.value)} placeholder="29.8739" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => updateForm("coordinatesRevealed", !form.coordinatesRevealed)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.coordinatesRevealed ? "bg-emerald-600" : "bg-slate-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.coordinatesRevealed ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-slate-900">Reveal coordinates to clients</p>
                  <p className="text-xs text-slate-500">If off, exact GPS location stays hidden</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Keywords */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Nearby Infrastructure</h2>
              <p className="text-sm text-slate-500">Add searchable keywords that help clients find your listing.</p>
              <div className="flex gap-2">
                <Input value={form.keywordInput} onChange={(e) => updateForm("keywordInput", e.target.value)} placeholder="e.g. ULK, Hospital, Market..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                <Button onClick={addKeyword} type="button">Add</Button>
              </div>
              {form.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.keywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {["Mount Kigali", "ULK", "University", "Church", "Hospital", "Market", "Bus Station", "School", "Main Road"].map(s => (
                  <button key={s} onClick={() => { if (!form.keywords.includes(s.toLowerCase()) && form.keywords.length < 10) updateForm("keywords", [...form.keywords, s.toLowerCase()]); }} className="px-3 py-1 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Preview */}
          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Preview Your Listing</h2>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
                    {imagePreviews.map((p, i) => <img key={i} src={p} alt="" className="aspect-square object-cover" />)}
                  </div>
                )}
                <h3 className="text-lg font-semibold">{form.title || "Untitled"}</h3>
                <p className="text-emerald-600 text-xl font-bold">{form.price ? `${parseInt(form.price).toLocaleString()} RWF` : "No price"}/month</p>
                <p className="text-sm text-slate-600">{form.description || "No description"}</p>
                <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                  {form.locationDistrict && <span>{form.locationSector}, {form.locationDistrict}</span>}
                  {form.bedrooms && <span>{form.bedrooms} beds</span>}
                  {form.bathrooms && <span>{form.bathrooms} baths</span>}
                  {form.areaValue && <span>{form.areaValue} m²</span>}
                </div>
                {form.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.keywords.map(kw => <span key={kw} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs">{kw}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Next<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting}>
            Publish Listing
          </Button>
        )}
      </div>
    </div>
  );
}
