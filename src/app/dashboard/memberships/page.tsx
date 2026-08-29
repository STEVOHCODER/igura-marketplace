"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Check, Home, MapPin, Crown } from "lucide-react";

export default function MembershipsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/property-types").then(r => r.json()),
      fetch("/api/memberships").then(r => r.json()),
    ]).then(([_, memData]) => {
      setMemberships(memData?.memberships || []);
    });

    fetch("/api/memberships").then(r => r.json()).then(d => {
      setMemberships(d?.memberships || []);
    });

    // Fetch all plans
    fetch("/api/property-types").catch(() => {});

    // For now, hardcode plan display (would normally come from API)
    setPlans([
      { id: "rental_client", marketplace: "House Rental", role: "Client", price: 2000, features: ["Search houses", "View listings", "Contact owners"], icon: Home, color: "emerald" },
      { id: "rental_commissionaire", marketplace: "House Rental", role: "Commissionaire", price: 5000, features: ["10 active listings", "3 images per listing", "Manage properties"], icon: Home, color: "emerald" },
      { id: "plot_client", marketplace: "Plot Selling (VIP)", role: "Client", price: 15000, features: ["Search plots", "View listings", "Contact owners"], icon: MapPin, color: "amber" },
      { id: "plot_commissionaire", marketplace: "Plot Selling (VIP)", role: "Commissionaire", price: 20000, features: ["10 active listings", "3 images per listing", "Manage plots"], icon: Crown, color: "amber" },
    ]);
    setLoading(false);
  }, []);

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Failed to initiate payment", "error");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast("Payment initiated. Check your phone for the payment prompt.", "success");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setPurchasing(null);
    }
  };

  const isActive = (planId: string) => {
    return memberships.some((m: any) => m.plan?.name === planId && m.status === "ACTIVE");
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Memberships & Plans</h1>
      <p className="text-slate-500 mb-8">Choose a marketplace and role to get started</p>

      {/* Active Memberships */}
      {memberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Active Memberships</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.plan?.displayName}</p>
                      <p className="text-sm text-slate-500">{m.plan?.marketplace?.displayName}</p>
                    </div>
                    <Badge variant={m.status === "ACTIVE" ? "success" : "warning"}>{m.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const active = isActive(plan.id);
          const Icon = plan.icon;
          return (
            <Card key={plan.id} className={active ? "border-emerald-300 bg-emerald-50/50" : ""}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-${plan.color}-100 flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 text-${plan.color}-600`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.marketplace}</CardTitle>
                    <p className="text-sm text-slate-500">{plan.role}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 mb-4">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-slate-500"> one-time</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handlePurchase(plan.id)}
                  disabled={active || purchasing === plan.id}
                  loading={purchasing === plan.id}
                  variant={active ? "outline" : "primary"}
                  className="w-full"
                >
                  {active ? "Active" : "Get Started"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
