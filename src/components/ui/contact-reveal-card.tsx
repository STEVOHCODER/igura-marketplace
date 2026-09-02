"use client";
import { useState } from "react";
import { Phone, Lock, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface ContactRevealCardProps {
  propertyId: string;
  contactPhone: string | null;
  contactName: string | null;
  contactRevealed: boolean;
  ownerInitials: string;
  ownerName: string;
  ownerRole: string;
  accentColor?: "emerald" | "violet" | "amber";
}

export function ContactRevealCard({
  propertyId,
  contactPhone,
  contactName,
  contactRevealed,
  ownerInitials,
  ownerName,
  ownerRole,
  accentColor = "emerald",
}: ContactRevealCardProps) {
  const [revealed, setRevealed] = useState(contactRevealed);
  const [phone, setPhone] = useState(contactPhone);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"mobile_money" | "bank_card">("mobile_money");
  const { toast } = useToast();

  const colorMap = {
    emerald: { bg: "from-emerald-500 to-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20", shadow: "shadow-emerald-200" },
    violet: { bg: "from-violet-500 to-violet-600", btn: "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20", shadow: "shadow-violet-200" },
    amber: { bg: "from-amber-500 to-amber-600", btn: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20", shadow: "shadow-amber-200" },
  };
  const colors = colorMap[accentColor];

  const handleReveal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/reveal-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, method }),
      });
      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.revealed || data.success) {
        setRevealed(true);
        setPhone(data.phone || contactPhone);
        toast("Contact revealed! You can now see the owner's phone number.", "success");
        return;
      }

      toast(data.error || "Could not initiate payment.", "error");
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sticky top-24 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Owner</h2>
      <div className="flex items-center gap-3 mb-5">
        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-sm ${colors.shadow}`}>
          <span className="text-sm font-bold text-white">{ownerInitials}</span>
        </div>
        <div>
          <div className="font-semibold text-slate-900">{ownerName}</div>
          <div className="text-sm text-slate-500">{ownerRole}</div>
        </div>
      </div>

      {revealed && phone ? (
        <>
          <a
            href={`tel:${phone}`}
            className={`flex items-center justify-center gap-2 w-full ${colors.btn} text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg`}
          >
            <Phone className="h-5 w-5" />
            Call {phone}
          </a>
          {contactName && (
            <p className="mt-3 text-sm text-slate-500 text-center">Ask for <span className="font-medium text-slate-700">{contactName}</span></p>
          )}
        </>
      ) : (
        <>
          <div className="relative mb-4">
            <div className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-400 py-3.5 rounded-xl font-semibold blur-sm select-none">
              <Phone className="h-5 w-5" />
              Call 07XXXXXXXX
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                <Lock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Reveal contact number</p>
                <p className="text-xs text-amber-600 mt-1">Pay a one-time fee of <strong>2,000 RWF</strong> to see the owner&apos;s phone number.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMethod("mobile_money")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${method === "mobile_money" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              Mobile Money
            </button>
            <button
              onClick={() => setMethod("bank_card")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${method === "bank_card" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              <CreditCard className="h-4 w-4 inline mr-1" />
              Card
            </button>
          </div>

          <Button
            onClick={handleReveal}
            disabled={loading}
            loading={loading}
            className="w-full"
            variant="primary"
          >
            {loading ? "Processing..." : "Reveal Number — 2,000 RWF"}
          </Button>
        </>
      )}
    </div>
  );
}
