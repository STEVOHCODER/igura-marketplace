"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || "";
  const status = searchParams.get("status") || "";

  const isSuccessful = status === "successful" || status === "SUCCESSFUL";
  const isFailed = status === "failed" || status === "FAILED";
  const isCancelled = status === "cancelled" || status === "CANCELLED";

  const getIcon = () => {
    if (isSuccessful) return <CheckCircle className="w-12 h-12 text-emerald-600 mb-4" />;
    if (isFailed) return <AlertCircle className="w-12 h-12 text-red-600 mb-4" />;
    if (isCancelled) return <Loader2 className="w-12 h-12 text-amber-600 mb-4 animate-spin" />;
    return <Loader2 className="w-12 h-12 text-slate-400 mb-4 animate-spin" />;
  };

  const getTitle = () => {
    if (isSuccessful) return "Payment Successful";
    if (isFailed) return "Payment Failed";
    if (isCancelled) return "Payment Cancelled";
    return "Processing...";
  };

  const renderContent = () => {
    if (isSuccessful) {
      return (
        <div>
          <h3 className="text-semibold text-slate-900 mb-3">Your membership is now active!</h3>
          <p className="text-slate-600">
            Thank you for your payment. Your membership has been activated and you can now access all premium features on Igura.
          </p>
          <a href="/dashboard" className="text-emerald-600 font-medium hover:underline">Go to Dashboard →</a>
        </div>
      );
    }
    if (isFailed) {
      return (
        <div>
          <h3 className="text-semibold text-slate-900 mb-3">Payment could not be completed</h3>
          <p className="text-slate-600">
            There was an issue with your payment. Please try again or contact support at support@igura.rw if the issue persists.
          </p>
          <a href="/dashboard/memberships" className="text-blue-600 font-medium hover:underline">Go back to memberships →</a>
        </div>
      );
    }
    if (isCancelled) {
      return (
        <div>
          <h3 className="text-semibold text-slate-900 mb-3">Payment was cancelled</h3>
          <p className="text-slate-600">Your payment was cancelled. You can return to complete your purchase anytime.</p>
          <a href="/dashboard/memberships" className="text-blue-600 font-medium hover:underline">Go back to memberships →</a>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 bg-slate-100">
      <div className="max-w-md w-full text-center">
        <div className="p-8 rounded-2xl bg-white shadow-lg">
          <div className="mx-auto mb-6">{getIcon()}</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{getTitle()}</h2>
          <p className="text-slate-600 mb-8">Reference: {reference || "N/A"}</p>
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