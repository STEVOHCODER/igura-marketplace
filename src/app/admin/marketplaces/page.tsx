"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatPrice } from "@/lib/utils";
import { Home, MapPin, Edit2, Save, X, DollarSign, Settings } from "lucide-react";

export default function AdminMarketplacesPage() {
  const [marketplaces, setMarketplaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/marketplaces")
      .then(r => r.json())
      .then(d => setMarketplaces(d?.marketplaces || []))
      .finally(() => setLoading(false));
  }, []);

  const saveMarketplace = async () => {
    try {
      const res = await fetch("/api/admin/marketplaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        toast("Marketplace updated", "success");
        setEditing(null);
        const refreshed = await fetch("/api/admin/marketplaces").then(r => r.json());
        setMarketplaces(refreshed?.marketplaces || []);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update", "error");
      }
    } catch {
      toast("Failed to update marketplace", "error");
    }
  };

  const savePlan = async () => {
    try {
      const res = await fetch("/api/admin/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planForm),
      });
      if (res.ok) {
        toast("Plan updated", "success");
        setEditingPlan(null);
        const refreshed = await fetch("/api/admin/marketplaces").then(r => r.json());
        setMarketplaces(refreshed?.marketplaces || []);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update plan", "error");
      }
    } catch {
      toast("Failed to update plan", "error");
    }
  };

  const toggleMarketplaceStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch("/api/admin/marketplaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast(`Marketplace ${newStatus.toLowerCase()}`, "success");
        setMarketplaces(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      }
    } catch {
      toast("Failed to update marketplace", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Marketplaces & Plans</h1>
        <p className="text-slate-500 text-sm mt-1">Manage marketplaces, pricing, and plan features</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {marketplaces.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${m.name.includes("House") ? "bg-emerald-100" : "bg-amber-100"}`}>
                      {m.name.includes("House") ? <Home className="h-5 w-5 text-emerald-600" /> : <MapPin className="h-5 w-5 text-amber-600" />}
                    </div>
                    <div>
                      {editing === m.id ? (
                        <div className="flex items-center gap-2">
                          <input value={editForm.displayName || ""} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} className="text-lg font-bold border border-slate-300 rounded px-2 py-1" />
                          <Button size="sm" onClick={saveMarketplace}><Save className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      ) : (
                        <CardTitle className="text-lg">{m.displayName}</CardTitle>
                      )}
                      <p className="text-sm text-slate-500">{m._count.properties} listings · {m._count.plans} plans</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={m.status === "ACTIVE" ? "success" : "danger"}>{m.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(m.id); setEditForm({ id: m.id, displayName: m.displayName, description: m.description }); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleMarketplaceStatus(m.id, m.status)}>
                      {m.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {m.plans.map((plan: any) => (
                    <div key={plan.id} className={`border rounded-lg p-4 ${plan.status === "ACTIVE" ? "border-slate-200 bg-white" : "border-red-200 bg-red-50/30"}`}>
                      {editingPlan === plan.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 w-20">Price (RWF):</label>
                            <input type="number" value={planForm.price || ""} onChange={(e) => setPlanForm({ ...planForm, price: parseInt(e.target.value) })} className="border border-slate-300 rounded px-3 py-1.5 text-sm w-32" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 w-20">Display Name:</label>
                            <input value={planForm.displayName || ""} onChange={(e) => setPlanForm({ ...planForm, displayName: e.target.value })} className="border border-slate-300 rounded px-3 py-1.5 text-sm flex-1" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 w-20">Max Listings:</label>
                            <input type="number" value={planForm.maxActiveListings || 0} onChange={(e) => setPlanForm({ ...planForm, maxActiveListings: parseInt(e.target.value) })} className="border border-slate-300 rounded px-3 py-1.5 text-sm w-20" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 w-20">Max Images:</label>
                            <input type="number" value={planForm.maxImagesPerListing || 0} onChange={(e) => setPlanForm({ ...planForm, maxImagesPerListing: parseInt(e.target.value) })} className="border border-slate-300 rounded px-3 py-1.5 text-sm w-20" />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600 w-20">Status:</label>
                            <select value={planForm.status || "ACTIVE"} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })} className="border border-slate-300 rounded px-3 py-1.5 text-sm">
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={savePlan}><Save className="h-3.5 w-3.5 mr-1" /> Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{plan.displayName}</h4>
                            <Badge variant={plan.status === "ACTIVE" ? "success" : "danger"}>{plan.status}</Badge>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-2xl font-bold text-slate-900">{formatPrice(plan.price)}</span>
                            <span className="text-sm text-slate-500">one-time</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                            <span>Role: <strong>{plan.role}</strong></span>
                            <span>Max listings: <strong>{plan.maxActiveListings}</strong></span>
                            <span>Max images: <strong>{plan.maxImagesPerListing}</strong></span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPlan(plan.id);
                              setPlanForm({
                                id: plan.id,
                                price: plan.price,
                                displayName: plan.displayName,
                                maxActiveListings: plan.maxActiveListings,
                                maxImagesPerListing: plan.maxImagesPerListing,
                                status: plan.status,
                              });
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Plan
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
