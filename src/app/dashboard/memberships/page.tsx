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
  // MTN MoMo prompts the payer's own handset: we send the number with the
  // request, then the buyer approves with their PIN and we poll the status.
  const [phone, setPhone] = useState("");
  const [pendingRefs, setPendingRefs] = useState<Record<string, string>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);

  const refreshMemberships = () => {
    return fetch("/api/memberships")
      .then(r => r.json())
      .then(d => {
        setMemberships(d?.memberships || []);
      })
      .catch(() => {});
  };

  const refreshPayments = () => {
    return fetch("/api/payments")
      .then(r => r.json())
      .then(d => {
        setPayments(d?.payments || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.user) {
        setUser(d.user);
        if (d.user.phone) setPhone(d.user.phone);
      }
    });

    refreshMemberships().finally(() => setLoading(false));
    refreshPayments();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch plans - filter by user role
    fetch("/api/plans")
      .then(r => r.json())
      .then(d => {
        const allPlans = d?.plans || [];
        // Show all plans to all users — clients browse free, commissionaires purchase listing plans
        setPlans(allPlans);
      })
      .catch(() => {});
  }, [user]);

  const handlePurchase = async (planId: string) => {
    if (!phone.trim()) {
      toast("Enter your MTN MoMo number first (e.g. 0788123456).", "error");
      return;
    }
    setPurchasing(planId);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, phone: phone.trim() }),
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
      } else if (data.pending && data.reference) {
        // MTN Request to Pay: the prompt is live on the buyer's handset.
        setPendingRefs(prev => ({ ...prev, [planId]: data.reference }));
        toast(data.message || "Payment request sent. Enter your MoMo PIN on your phone to approve.", "success");
        await refreshMemberships();
        await refreshPayments();
      } else {
        toast("Payment initiated. Check your phone for the payment prompt.", "success");
        await refreshMemberships();
        await refreshPayments();
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setPurchasing(null);
    }
  };

  const handleCheckStatus = async (planId: string) => {
    const reference = pendingRefs[planId];
    if (!reference) return;
    setChecking(planId);
    try {
      const res = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
      const data = await res.json();
      const status = data?.payment?.status;
      if (status === "SUCCESSFUL") {
        toast("Payment confirmed — your membership is active.", "success");
      } else if (status === "FAILED" || status === "CANCELLED") {
        toast("Payment did not go through. No money was taken — you can try again.", "error");
      } else {
        toast("Still waiting for approval. Enter your MoMo PIN on your phone, then check again.", "error");
      }
      await refreshMemberships();
      await refreshPayments();
    } catch {
      toast("Could not check status. Please try again.", "error");
    } finally {
      setChecking(null);
    }
  };

  const handleCheckPayment = async (paymentId: string, reference: string | null) => {
    if (!reference) return;
    setChecking(paymentId);
    try {
      const res = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
      const data = await res.json();
      const status = data?.payment?.status;
      if (status === "SUCCESSFUL") {
        toast("Payment confirmed.", "success");
      } else if (status === "FAILED" || status === "CANCELLED") {
        toast("Payment did not go through. No money was taken.", "error");
      } else {
        toast("Still waiting for approval on your phone.", "error");
      }
      await refreshMemberships();
      await refreshPayments();
    } catch {
      toast("Could not check status. Please try again.", "error");
    } finally {
      setChecking(null);
    }
  };

  // Cancelled rows are history, not state: showing them next to live
  // memberships reads as "stuck". The full ledger lives below.
  const visibleMemberships = memberships.filter((m: any) => m.status !== "CANCELLED");

  // Match by exact plan: matching on marketplace+role lit up every tier
  // card (Starter/Professional/Enterprise) from a single ACTIVE Starter.
  const hasActiveMembership = (planId: string) => {
    return memberships.some((m: any) =>
      (m.planId === planId || m.plan?.id === planId) &&
      m.status === "ACTIVE"
    );
  };

  const isPending = (planId: string) => {
    return memberships.some((m: any) =>
      (m.planId === planId || m.plan?.id === planId) &&
      m.status === "PENDING"
    );
  };

  const rentalPlans = plans.filter(p => p.marketplace?.name === "House Rental");
  const plotPlans = plans.filter(p => p.marketplace?.name === "Plot Selling VIP");
  const houseSalePlans = plans.filter(p => p.marketplace?.name === "House Selling VVIP");

  const renderPlanCard = (plan: any) => {
    const active = hasActiveMembership(plan.id);
    const pending = isPending(plan.id);
    const isCommissionaire = plan.role === "COMMISSIONAIRE";
    const isPlot = plan.marketplace?.name === "Plot Selling VIP";
    const isHouseSale = plan.marketplace?.name === "House Selling VVIP";
    const isRecommended = plan.displayName === "Professional";

    return (
      <Card key={plan.id} className={`${active ? "border-emerald-300 bg-emerald-50/50" : ""} ${isRecommended ? "border-emerald-500 shadow-lg relative" : ""}`}>
        {isRecommended && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Recommended</span>
          </div>
        )}
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg ${isHouseSale ? "bg-violet-100" : isPlot ? "bg-amber-100" : "bg-emerald-100"} flex items-center justify-center`}>
              {isCommissionaire ? (
                <Crown className={`h-5 w-5 ${isHouseSale ? "text-violet-600" : isPlot ? "text-amber-600" : "text-emerald-600"}`} />
              ) : (
                <Check className={`h-5 w-5 ${isHouseSale ? "text-violet-600" : isPlot ? "text-amber-600" : "text-emerald-600"}`} />
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
            <span className="text-sm font-normal text-slate-500"> /month</span>
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
            onClick={() => pending && pendingRefs[plan.id] ? handleCheckStatus(plan.id) : handlePurchase(plan.id)}
            disabled={active || purchasing === plan.id || checking === plan.id || (pending && !pendingRefs[plan.id])}
            loading={purchasing === plan.id || checking === plan.id}
            variant={active ? "outline" : "primary"}
            className="w-full"
          >
            {active ? t("memberships.active") : pending && pendingRefs[plan.id] ? "Check payment status" : pending ? t("memberships.pending") : t("memberships.getStarted")}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("memberships.title")}</h1>
      <p className="text-slate-500 mb-6">{t("memberships.subtitle")}</p>

      {/* MTN MoMo number: the payment prompt goes to this handset */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">MTN MoMo number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0788123456"
            inputMode="tel"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">You will approve the payment with your MoMo PIN on this number.</p>
        </CardContent>
      </Card>

      {/* Active Memberships */}
      {visibleMemberships.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">{t("memberships.yourMemberships")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleMemberships.map((m: any) => (
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plotPlans.map(renderPlanCard)}
          </div>
        </div>
      )}

      {/* House Selling VVIP Plans */}
      {houseSalePlans.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">{t("memberships.houseSellingVvip")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {houseSalePlans.map(renderPlanCard)}
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

      {/* Payment ledger: every attempt in one place, newest first */}
      {payments.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent payments</h2>
          <Card>
            <CardContent className="p-0 divide-y divide-slate-100">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {p.kind === "reveal" ? "Contact reveal" : (p.planName || "Membership")} &middot; {Number(p.amount).toLocaleString()} {p.currency}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {p.reference || "no reference"} &middot; {p.createdAt ? new Date(p.createdAt).toLocaleString("en-RW") : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={p.status === "SUCCESSFUL" ? "success" : p.status === "PENDING" ? "warning" : "danger"}>{p.status}</Badge>
                    {p.status === "PENDING" && p.reference && (
                      <Button
                        onClick={() => handleCheckPayment(p.id, p.reference)}
                        disabled={checking === p.id}
                        loading={checking === p.id}
                        variant="outline"
                      >
                        Check
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
