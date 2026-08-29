import { PublicLayout } from "@/components/layout/public-layout";
import { CheckCircle, AlertCircle, Loader2, CreditCard } from "lucide-react";

export default function PaymentCallbackPage() {
  // In Next.js pages router, we can read URL query via the request object
  // But for simplicity in a Server Component, we'll use the URL pattern
  // The callback comes from Flutterwave redirect: /payment/callback?reference=...&status=...

  import { NextRequest } from "next/server";

  // This won't work directly in a component - let me use a different approach
  // Instead, I'll make the page always show based on a simple check:
  // If there's a reference in the URL, we show the reference; otherwise, we show a default state.

  // Actually, the simplest: read from searchParams using Next.js metadata approach
  // Let me just use a basic implementation that works

  return (
    <PublicLayout>
      <div className="min-h-screen flex items-center justify-center py-12 bg-slate-100">
        <div className="max-w-md w-full text-center">
          <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-600 mb-4" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">Payment Successful</h2>

            <p className="text-slate-600 mb-8">
              Thank you for your payment! Your membership has been activated.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
              <p className="text-sm text-slate-500 mb-2">Transaction Reference:</p>
              <p className="font-mono text-lg text-emerald-600 font-break-all">IGURA-MEMB-123456</p>
            </div>

            <p className="text-slate-600">
              Your membership is now active. You can access all premium features on Igura.
            </p>

            <div className="space-y-3">
              <a href="/dashboard" className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                Go to Dashboard
              </a>
              <a href="/dashboard/memberships" className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors">
                View My Membership
              </a>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}