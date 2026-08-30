"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const reference = searchParams.get("reference") || searchParams.get("tx_ref") || "";
  const status = searchParams.get("status") || "";
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState<"success" | "failed" | "pending">("pending");

  const isSuccessful = status === "successful" || status === "SUCCESSFUL" || verified === "success";
  const isFailed = status === "failed" || status === "FAILED" || verified === "failed";

  useEffect(() => {
    if (reference) {
      // Verify payment server-side
      fetch(`/api/payments/verify/${reference}`)
        .then(r => r.json())
        .then(data => {
          if (data.payment?.status === "SUCCESSFUL") {
            setVerified("success");
          } else if (data.payment?.status === "FAILED") {
            setVerified("failed");
          } else {
            setVerified(status === "successful" || status === "SUCCESSFUL" ? "success" : "pending");
          }
        })
        .catch(() => {
          setVerified(status === "successful" || status === "SUCCESSFUL" ? "success" : "failed");
        })
        .finally(() => setVerifying(false));
    } else {
      setVerifying(false);
    }
  }, [reference, status]);

  const getIcon = () => {
    if (verifying) return <Loader2 className="w-12 h-12 text-slate-400 mb-4 animate-spin" />;
    if (isSuccessful) return <CheckCircle className="w-12 h-12 text-emerald-600 mb-4" />;
    if (isFailed) return <AlertCircle className="w-12 h-12 text-red-600 mb-4" />;
    return <AlertCircle className="w-12 h-12 text-amber-600 mb-4" />;
  };

  const getTitle = () => {
    if (verifying) return t("payment.verifying");
    if (isSuccessful) return t("payment.success");
    if (isFailed) return t("payment.failed");
    return t("payment.pending");
  };

  const renderContent = () => {
    if (verifying) {
      return (
        <p className="text-slate-600">
          {t("payment.verifyingDesc")}
        </p>
      );
    }
    if (isSuccessful) {
      return (
        <div>
          <h3 className="text-semibold text-slate-900 mb-3">{t("payment.successHeading")}</h3>
          <p className="text-slate-600">
            {t("payment.successDesc")}
          </p>
          <a href="/dashboard" className="text-emerald-600 font-medium hover:underline">{t("payment.goDashboard")}</a>
        </div>
      );
    }
    if (isFailed) {
      return (
        <div>
          <h3 className="text-semibold text-slate-900 mb-3">{t("payment.failedHeading")}</h3>
          <p className="text-slate-600">
            {t("payment.failedDesc")}
          </p>
          <a href="/dashboard/memberships" className="text-blue-600 font-medium hover:underline">{t("payment.goBack")}</a>
        </div>
      );
    }
    return (
      <div>
        <h3 className="text-semibold text-slate-900 mb-3">{t("payment.pendingHeading")}</h3>
        <p className="text-slate-600">
          {t("payment.pendingDesc")}
        </p>
        <a href="/dashboard" className="text-blue-600 font-medium hover:underline">{t("payment.goDashboard")}</a>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-slate-100">
      <div className="max-w-md w-full text-center">
        <div className="p-8 rounded-2xl bg-white shadow-lg">
          <div className="mx-auto mb-6">{getIcon()}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{getTitle()}</h2>
          {reference && <p className="text-slate-500 text-sm mb-6">{t("payment.reference")} {reference}</p>}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <PublicLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center py-12 bg-slate-100">
          <Loader2 className="w-12 h-12 text-slate-400 animate-spin" />
        </div>
      }>
        <PaymentCallbackContent />
      </Suspense>
    </PublicLayout>
  );
}
