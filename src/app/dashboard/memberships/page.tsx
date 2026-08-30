"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Check, Home, MapPin, Crown } from "lucide-react";
import { useI18n } from "@/i18n";

export default function MembershipsPage() {
  const { t } = useI18n();
  const [plans, setPlans] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.user) setUser(d.user);
    });

    fetch("/api/memberships")
      .then(r => r.json())
      .then(d => {
        setMemberships(d?.memberships || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch plans - filter by user role
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const allPlans = d?.plans || [];
        // Clients only see CLIENT plans, Commissionaires see COMMISSIONAIRE plans, Admin sees all
        if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
          setPlans(allPlans);
        } else {
          setPlans(allPlans.filter((p: any) => p.role === user.role));
        }
      })
      .catch(() => {});
  }, [user]);

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
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else if (data.checkoutUrl) {
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

  const hasActiveMembership = (marketplaceName: string, role: string) => {
    return memberships.some((m: any) =>
      m.plan?.marketplace?.name === marketplaceName &&
      m.plan?.role === role &&
      m.status === "ACTIVE"
    );
  };

  const isPending = (marketplaceName: string, role: string) => {
    return memberships.some((m: any) =>
      m.plan?.marketplace?.name === marketplaceName &&
      m.plan?.role === role &&
      m.status === "PENDING"
    );
  };

  const rentalPlans = plans.filter(p => p.marketplace?.name === "House Rental");
  const plotPlans = plans.filter(p => p.marketplace?.name === "Plot Selling VIP");

  const renderPlanCard = (plan: any) => {
    const active = hasActiveMembership(plan.marketplace?.name, plan.role);
    const pending = isPending(plan.marketplace?.name, plan.role);
    const isCommissionaire = plan.role === "COMMISSIONAIRE";
    const isPlot = plan.marketplace?.name === "Plot Selling VIP";

    return (
      <Card key={plan.id} className={active ? "border-emerald-300 bg-emerald-50/50" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${isPlot ? "bg-amber-100" : "bg-emerald-100"} flex items-center justify-center`}>
              {isCommissionaire ? (
                <Crown className={`h-5 w-5 ${isPlot ? "text-amber-600" : "text-emerald-600"}`} />
              ) : (
                <Check className={`h-5 w-5 ${isPlot ? "text-amber-600" : "text-emerald-600"}`} />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{plan.displayName}</CardTitle>
              <p className="text-sm text-slate-500">{isCommissionaire ? "Commissionaire" : "Client"} &middot; {plan.marketplace?.displayName}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-slate-900 mb-4">
            {formatPrice(plan.price)}
            <span className="text-sm font-normal text-slate-500"> {t("memberships.oneTime")}</span>
          </div>
          <ul className="space-y-2 mb-6">
            {(plan.features || []).map((f: string, i: number) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            onClick={() => handlePurchase(plan.id)}
            disabled={active || pending || purchasing === plan.id}
            loading={purchasing === plan.id}
            variant={active ? "outline" : "primary"}
            className="w-full"
          >
            {active ? t("memberships.active") : pending ? t("memberships.pending") : t("memberships.getStarted")}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("memberships.title")}</h1>
      <p className="text-slate-500 mb-8">{t("memberships.subtitle")}</p>

      {/* Active Memberships */}
      {memberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("memberships.yourMemberships")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.plan?.displayName}</p>
                      <p className="text-sm text-slate-500">{m.plan?.marketplace?.displayName} &middot; {m.plan?.role === "COMMISSIONAIRE" ? "Commissionaire" : "Client"}</p>
                    </div>
                    <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "PENDING" ? "warning" : "danger"}>{m.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* House Rental Plans */}
      {rentalPlans.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t("memberships.houseRental")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rentalPlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {/* Plot Selling Plans */}
      {plotPlans.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t("memberships.plotSelling")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plotPlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {plans.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            {t("memberships.noPlans")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
