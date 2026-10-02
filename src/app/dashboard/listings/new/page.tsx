"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Upload, X, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n";

const STEPS = ["Type", "Images", "Details", "Location", "Coordinates", "Keywords", "Preview"];

export default function NewListingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
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
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [videoAccess, setVideoAccess] = useState<{ allowed: boolean; maxDuration: number; maxTotalVideos: number; isFreePeriod: boolean }>({ allowed: false, maxDuration: 0, maxTotalVideos: 0, isFreePeriod: false });

const MAX_VIDEO_SECONDS = 40;
// Must match MAX_SIZE in the video API route. It was 25MB there and here, which
// is smaller than most 20-second phone clips.
const MAX_VIDEO_SIZE = 60 * 1024 * 1024;
  const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

  useEffect(() => {
    fetch("/api/property-types").then(r => r.json()).then(d => setPropertyTypes(d?.propertyTypes || d?.types || []));
    fetch("/api/access/video").then(r => r.json()).then(d => {
      setVideoAccess({
        allowed: d.videoAllowed || false,
        maxDuration: d.maxVideoLengthSeconds || 0,
        maxTotalVideos: d.maxTotalVideos || 0,
        isFreePeriod: d.isFreePeriod || false,
      });
    }).catch(() => {});
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
      toast(t("create.maxImages"), "error");
      return;
    }
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) { toast(`${f.name} ${t("create.tooLarge")}`, "error"); return false; }
      if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast(`${f.name} ${t("create.unsupported")}`, "error"); return false; }
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

  const handleVideoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) { toast(t("create.videoUnsupported"), "error"); return; }
    if (file.size > MAX_VIDEO_SIZE) { toast(t("create.videoTooLarge"), "error"); return; }

    const maxSec = videoAccess.maxDuration || MAX_VIDEO_SECONDS;
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      URL.revokeObjectURL(probe.src);
      if (probe.duration > maxSec + 1) {
        toast(t("create.videoTooLong"), "error");
        return;
      }
      setVideoDuration(probe.duration);
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
    };
    probe.src = URL.createObjectURL(file);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview("");
  };

  // The API returns zod details as a JSON string; surface the first field
  // problem ("contactName: ...") instead of a bare "Validation failed".
  const serverFieldError = (data: any): string | null => {
    try {
      const issues = JSON.parse(data?.details || "[]");
      const first = Array.isArray(issues) ? issues[0] : null;
      if (first?.path?.length && first?.message) return `${first.path.join(".")}: ${first.message}`;
    } catch { /* fall through to the generic message */ }
    return null;
  };

  const handleSubmit = async () => {
    // Client-side validation (mirrors the server schema minimums so the
    // user hears about a short title here, not as "Validation failed").
    if (!form.title.trim() || form.title.trim().length < 5) { toast("Title is required (at least 5 characters)", "error"); return; }
    if (!form.description.trim() || form.description.trim().length < 20) { toast("Description is required (at least 20 characters)", "error"); return; }
    if (!form.propertyTypeId) { toast("Property type is required", "error"); return; }
    if (!form.price || parseInt(form.price) <= 0) { toast("Valid price is required", "error"); return; }
    if (!form.contactPhone.trim()) { toast("Contact phone is required", "error"); return; }
    if (!form.locationDistrict) { toast("District is required", "error"); return; }
    // A listing is published the moment it is submitted, so it must arrive with
    // at least one photo. The server enforces this again on publish.
    if (images.length < 1) { toast("Add at least one photo", "error"); return; }

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
      if (!res.ok) { toast(serverFieldError(data) || data.error || t("create.failedCreate"), "error"); return; }

      const propertyId = data.property.id;

      // Upload images
      let imageUploadFailed = false;
      for (let i = 0; i < images.length; i++) {
        const fd = new FormData();
        fd.append("file", images[i]);
        fd.append("sortOrder", i.toString());
        const imgRes = await fetch(`/api/properties/${propertyId}/images`, { method: "POST", body: fd });
        if (!imgRes.ok) imageUploadFailed = true;
      }

      if (video) {
        const fd = new FormData();
        fd.append("file", video);
        if (videoDuration != null) fd.append("duration", String(videoDuration));
        const vRes = await fetch(`/api/properties/${propertyId}/video`, { method: "POST", body: fd });
        if (!vRes.ok) {
          const videoError = await vRes.json().catch(() => ({}));
          toast(videoError.error || t("create.videoUploadFailed"), "error");
        }
      }

      // Publish straight away. There is no separate draft stage: the listing only
      // goes live once its photos exist, so the order above matters.
      const pubRes = await fetch(`/api/properties/${propertyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      if (!pubRes.ok) {
        const pubErr = await pubRes.json().catch(() => ({}));
        toast(pubErr.error || t("create.failedCreate"), "error");
        router.push(`/dashboard/listings/${propertyId}/edit`);
        return;
      }

      if (imageUploadFailed) {
        toast("Published, but some photos failed to upload. Add them from the edit page.", "error");
      } else {
        toast(t("create.successCreate"), "success");
      }
      router.push("/dashboard/listings");
    } catch {
      toast(t("create.wrong"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const districts = ["Gasabo","Kicukiro","Nyarugenge","Huye","Rubavu","Musanze","Nyagatare","Rwamagana","Muhanga","Kayonza","Gicumbi","Nyanza","Bugesera"];

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t("create.title")}</h1>

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
              <h2 className="text-lg font-semibold">{t("create.selectMarketplace")}</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t("create.marketplace")}</label>
                <div className="grid grid-cols-2 gap-3">
                  {([["house_rental", "House Rental"], ["plot_sale", "Plot Selling VIP"]] as const).map(([m, name]) => (
                    <button key={m} onClick={() => { updateForm("marketplace", name); updateForm("propertyTypeId", ""); }} className={`p-4 rounded-xl border-2 text-left transition-all ${form.marketplace === name ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <p className="font-medium">{m === "house_rental" ? t("create.houseRental") : t("create.plotSelling")}</p>
                      <p className="text-sm text-slate-500 mt-1">{m === "house_rental" ? t("create.rentHouses") : t("create.sellPlots")}</p>
                    </button>
                  ))}
                </div>
              </div>
              {form.marketplace && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t("create.propertyType")}</label>
                  <select value={form.propertyTypeId} onChange={(e) => updateForm("propertyTypeId", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">{t("create.selectType")}</option>
                    {propertyTypes.filter((t: any) => t.marketplace?.name === form.marketplace).map((t: any) => (
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
              <h2 className="text-lg font-semibold">{t("create.propertyImages")}</h2>
              <p className="text-sm text-slate-500">{t("create.imagesDesc")}</p>
              <div className="grid grid-cols-3 gap-4">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={preview} alt={`Preview image ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                    <Upload className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">{t("create.addImage")}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageAdd} className="hidden" />
                  </label>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">{t("create.propertyVideo")}</h3>
                {!videoAccess.allowed ? (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mt-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-800">Video upload requires Professional or Enterprise plan</p>
                      <p className="text-xs text-amber-600 mt-0.5">Upgrade your membership to add video walkthroughs to your listings</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => router.push("/dashboard/memberships")}>
                      Upgrade
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-500 mb-3">
                      {videoAccess.isFreePeriod
                        ? `Free trial — ${videoAccess.maxDuration}s max, ${videoAccess.maxTotalVideos} video slots remaining`
                        : `Upload video up to ${videoAccess.maxDuration}s, ${videoAccess.maxTotalVideos} video slots on your plan`
                      }
                    </p>
                    {videoPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 max-w-sm">
                        <video src={videoPreview} controls className="w-full aspect-video bg-black" />
                        <button onClick={removeVideo} className="absolute top-2 right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-slate-300 cursor-pointer hover:border-emerald-400 transition-colors">
                        <Upload className="h-8 w-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-500">{t("create.addVideo")}</span>
                        <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoAdd} className="hidden" />
                      </label>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("create.propertyDetails")}</h2>
              <Input label={t("create.title_")} placeholder={t("create.titlePlaceholder")} value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("create.description_")}</label>
                <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" placeholder={t("create.descPlaceholder")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("create.priceMonth")} type="number" placeholder={t("create.pricePlaceholder")} value={form.price} onChange={(e) => updateForm("price", e.target.value)} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t("create.negotiable")}</label>
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => updateForm("negotiable", true)} className={`px-4 py-2 rounded-lg text-sm font-medium ${form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t("create.negotiable")}</button>
                    <button onClick={() => updateForm("negotiable", false)} className={`px-4 py-2 rounded-lg text-sm font-medium ${!form.negotiable ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{t("create.fixedPrice")}</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input label={t("create.bedrooms_")} type="number" value={form.bedrooms} onChange={(e) => updateForm("bedrooms", e.target.value)} />
                <Input label={t("create.bathrooms_")} type="number" value={form.bathrooms} onChange={(e) => updateForm("bathrooms", e.target.value)} />
                <Input label={t("create.areaM2")} type="number" value={form.areaValue} onChange={(e) => updateForm("areaValue", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("create.yourName")} value={form.contactName} onChange={(e) => updateForm("contactName", e.target.value)} placeholder={t("create.namePlaceholder")} />
                <Input label={t("create.contactPhone")} value={form.contactPhone} onChange={(e) => updateForm("contactPhone", e.target.value)} placeholder={t("create.phonePlaceholder")} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("create.availability_")}</label>
                <select value={form.availabilityStatus} onChange={(e) => updateForm("availabilityStatus", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="AVAILABLE">{t("create.availableNow")}</option>
                  <option value="UPCOMING">{t("create.availableSpecific")}</option>
                  <option value="UNAVAILABLE">{t("create.unavailable")}</option>
                </select>
              </div>
              {form.availabilityStatus === "UPCOMING" && (
                <Input label={t("create.availableFrom")} type="date" value={form.availabilityDate} onChange={(e) => updateForm("availabilityDate", e.target.value)} />
              )}
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("create.location_")}</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("create.district")}</label>
                <select value={form.locationDistrict} onChange={(e) => updateForm("locationDistrict", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">{t("create.selectDistrict")}</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <Input label={t("create.sector_")} value={form.locationSector} onChange={(e) => updateForm("locationSector", e.target.value)} placeholder={t("create.sectorPlaceholder")} />
              <Input label={t("create.cell_")} value={form.locationCell} onChange={(e) => updateForm("locationCell", e.target.value)} placeholder={t("create.cellPlaceholder")} />
              <Input label={t("create.village_")} value={form.locationVillage} onChange={(e) => updateForm("locationVillage", e.target.value)} placeholder={t("create.villagePlaceholder")} />
            </div>
          )}

          {/* Step 4: Coordinates */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("create.gpsCoordinates")}</h2>
              <p className="text-sm text-slate-500">{t("create.gpsDesc")}</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label={t("create.latitude")} type="number" step="any" value={form.latitude} onChange={(e) => updateForm("latitude", e.target.value)} placeholder="-1.9403" />
                <Input label={t("create.longitude")} type="number" step="any" value={form.longitude} onChange={(e) => updateForm("longitude", e.target.value)} placeholder="29.8739" />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.coordinatesRevealed}
                  aria-label="Reveal GPS coordinates on listing"
                  onClick={() => updateForm("coordinatesRevealed", !form.coordinatesRevealed)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.coordinatesRevealed ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.coordinatesRevealed ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t("create.revealCoords")}</p>
                  <p className="text-xs text-slate-500">{t("create.coordsHidden")}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Keywords */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t("create.nearbyInfra")}</h2>
              <p className="text-sm text-slate-500">{t("create.nearbyDesc")}</p>
              <div className="flex gap-2">
                <Input value={form.keywordInput} onChange={(e) => updateForm("keywordInput", e.target.value)} placeholder={t("create.nearbyPlaceholder")} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())} />
                <Button onClick={addKeyword} type="button">{t("create.add")}</Button>
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
              <h2 className="text-lg font-semibold">{t("create.previewListing")}</h2>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
                    {imagePreviews.map((p, i) => <img key={i} src={p} alt="" className="aspect-square object-cover" />)}
                  </div>
                )}
                {videoPreview && (
                  <video src={videoPreview} controls className="w-full aspect-video rounded-lg bg-black" />
                )}
                <h3 className="text-lg font-semibold">{form.title || t("create.untitled")}</h3>
                <p className="text-emerald-600 text-xl font-bold">{form.price ? `${parseInt(form.price).toLocaleString()} RWF` : t("create.noPrice")}/month</p>
                <p className="text-sm text-slate-600">{form.description || t("create.noDesc")}</p>
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
          <ArrowLeft className="h-4 w-4 mr-1" />{t("create.back")}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t("create.next")}<ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting}>
            {t("create.publishListing")}
          </Button>
        )}
      </div>
    </div>
  );
}
