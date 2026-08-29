"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/payments")
      .then(r => r.json())
      .then(d => setPayments(d?.payments || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? payments : payments.filter(p => p.status === filter.toUpperCase());

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Transactions</h1>
      <p className="text-slate-500 mb-6">{payments.length} total transactions</p>

      <div className="flex gap-2 mb-6">
        {["all", "successful", "pending", "failed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reference</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Marketplace</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No transactions found</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference || p.providerTransactionId || "—"}</td>
                    <td className="px-4 py-3">{p.user?.firstName} {p.user?.lastName}</td>
                    <td className="px-4 py-3 text-slate-500">{p.plan?.marketplace?.displayName}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.method}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "SUCCESSFUL" ? "success" : p.status === "FAILED" ? "danger" : "warning"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
