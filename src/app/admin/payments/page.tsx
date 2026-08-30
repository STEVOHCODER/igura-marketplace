"use client";
import { useEffect, useState } from "react";
import { Search, DollarSign, TrendingUp, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/admin/payments")
      .then(r => r.json())
      .then(d => setPayments(d?.payments || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = payments.filter(p => {
    const matchFilter = filter === "all" || p.status === filter.toUpperCase();
    const matchSearch = !search ||
      p.reference?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalRevenue = payments.filter(p => p.status === "SUCCESSFUL").reduce((sum, p) => sum + p.amount, 0);
  const successfulCount = payments.filter(p => p.status === "SUCCESSFUL").length;
  const pendingCount = payments.filter(p => p.status === "PENDING").length;
  const failedCount = payments.filter(p => p.status === "FAILED").length;

  const summaryCards = [
    { label: t("adminPayments.totalRevenue"), value: formatPrice(totalRevenue), icon: DollarSign, color: "bg-emerald-100 text-emerald-600" },
    { label: t("adminPayments.successful"), value: successfulCount, icon: CheckCircle, color: "bg-green-100 text-green-600" },
    { label: t("adminPayments.pending"), value: pendingCount, icon: Clock, color: "bg-amber-100 text-amber-600" },
    { label: t("adminPayments.failed"), value: failedCount, icon: XCircle, color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("adminPayments.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{payments.length} {t("adminPayments.totalTransactions")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-xs text-slate-500">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t("adminPayments.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div className="flex gap-2">
          {["all", "successful", "pending", "failed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? "bg-emerald-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t(`adminPayments.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.reference")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.user")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.marketplace")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.plan")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.amount")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.method")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.status")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminPayments.date")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{t("adminPayments.loading")}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{t("adminPayments.noTransactions")}</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs">{p.reference || p.providerTransactionId || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{p.user?.firstName} {p.user?.lastName}</div>
                      <div className="text-xs text-slate-400">{p.user?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.plan?.marketplace?.displayName || "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{p.plan?.displayName || "—"}</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(p.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{p.method}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.status === "SUCCESSFUL" ? "success" : p.status === "FAILED" ? "danger" : "warning"}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(p.createdAt)}</td>
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
