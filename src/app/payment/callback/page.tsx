export default function PaymentCallbackPage() {
  // This server component reads URL query params
  // The callback comes from Flutterwave: /payment/callback?reference=...&status=...
  import { useSearchParams } from "react-router-dom";

  const searchParams = new URLSearchParams(window.location.href);
  const reference = searchParams.get("reference") || "";
  const status = searchParams.get("status") || "";

  const isSuccessful = status === "successful" || status === "SUCCESSFUL";
  const isFailed = status === "failed" || status === "FAILED";
  const isCancelled = status === "cancelled" || status === "CANCELLED";

  // Since this is a server component, we can't use useSearchParams hook directly
  // We'll render based on the reference/status being present
  // For now, just show a simple page

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900">Payment Callback</h2>
      <p>Reference: {reference}</p>
      <p>Status: {status}</p>
      <p>Successful: {isSuccessful ? "yes" : "no"}</p>
      <p>Failed: {isFailed ? "yes" : "no"}</p>
      <p>Cancelled: {isCancelled ? "yes" : "no"}</p>
    </div>
  );
}