"use client";
import Link from "next/link";
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
  ownerId?: string;
  accentColor?: "emerald" | "violet" | "amber";
  paymentsEnabled?: boolean;
}

export function ContactRevealCard({
  propertyId,
  contactPhone,
  contactName,
  contactRevealed,
  ownerInitials,
  ownerName,
  ownerRole,
  ownerId,
  accentColor = "emerald",
  paymentsEnabled = false,
}: ContactRevealCardProps) {
  const [revealed, setRevealed] = useState(contactRevealed);
  const [phone, setPhone] = useState(contactPhone);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<"mobile_money" | "bank_card">("mobile_money");
  // MTN MoMo: the payer types their own number, approves on their handset,
  // then confirms here. `pendingRef` is our payment reference to poll.
  const [payerPhone, setPayerPhone] = useState("");
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const colorMap = {
    emerald: { bg: "from-emerald-500 to-emerald-600", btn: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20", shadow: "shadow-emerald-200" },
    violet: { bg: "from-violet-500 to-violet-600", btn: "bg-violet-600 hover:bg-violet-500 shadow-violet-600/20", shadow: "shadow-violet-200" },
    amber: { bg: "from-amber-500 to-amber-600", btn: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20", shadow: "shadow-amber-200" },
  };
  const colors = colorMap[accentColor];

  const waNumber = (() => {
    const digits = (phone || "").replace(/[^\d]/g, "");
    if (/^07\d{8}$/.test(digits)) return "250" + digits.slice(1);
    if (/^250\d{9}$/.test(digits)) return digits;
    return digits || null;
  })();

  const handleReveal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/reveal-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, method, phone: payerPhone.trim() || undefined }),
      });
      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.pending && data.reference) {
        setPendingRef(data.reference);
        toast(data.message || "Payment request sent. Enter your MoMo PIN on your phone to approve.", "success");
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

  const handleCheckReveal = async () => {
    if (!pendingRef) return;
    setChecking(true);
    try {
      const res = await fetch(
        `/api/payments/reveal-contact?reference=${encodeURIComponent(pendingRef)}&propertyId=${encodeURIComponent(propertyId)}`
      );
      const data = await res.json();
      if (data.revealed || data.success) {
        setRevealed(true);
        setPhone(data.phone || contactPhone);
        setPendingRef(null);
        toast("Contact revealed! You can now see the owner's phone number.", "success");
        return;
      }
      toast("Still waiting for approval. Enter your MoMo PIN on your phone, then check again.", "error");
    } catch {
      toast("Could not check status. Please try again.", "error");
    } finally {
      setChecking(false);
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
          {ownerId && (
            <Link href={`/owners/${ownerId}`} className="text-xs font-medium text-emerald-600 hover:underline">
              View profile &amp; all listings
            </Link>
          )}
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
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello, I'm interested in your property on Igura.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-semibold hover:brightness-95 transition-all"
            >
              WhatsApp owner
            </a>
          )}
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
                <p className="text-xs text-amber-600 mt-1">Create an account to reveal the owner&apos;s phone number. Contact payments will be enabled later.</p>
              </div>
            </div>
          </div>

          {paymentsEnabled && (
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
          )}

          {paymentsEnabled && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Your MTN MoMo number</label>
            <input
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="Optional during free launch"
              inputMode="tel"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
            />
          </div>
          )}

          {pendingRef ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-emerald-800 font-medium mb-1">Payment request sent</p>
              <p className="text-xs text-emerald-600 mb-3">Enter your MoMo PIN on your phone to approve the 2,000 RWF payment, then tap below.</p>
              <Button
                onClick={handleCheckReveal}
                disabled={checking}
                loading={checking}
                className="w-full"
                variant="primary"
              >
                {checking ? "Checking..." : "I've approved — show number"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleReveal}
              disabled={loading}
              loading={loading}
              className="w-full"
              variant="primary"
            >
              {loading ? "Processing..." : paymentsEnabled ? "Reveal Number — 2,000 RWF" : "Reveal Number — Free"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
