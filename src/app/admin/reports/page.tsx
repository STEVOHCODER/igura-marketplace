"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatPrice } from "@/lib/utils";
import { AlertTriangle, Eye, Trash2, Ban, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(r => r.json())
      .then(d => setReports(d?.reports || []))
      .finally(() => setLoading(false));
  }, []);

  const updateReport = async (id: string, status: string, adminNote?: string, actionOnProperty?: string) => {
    setActionLoading(id + status);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote, actionOnProperty }),
      });
      if (res.ok) {
        toast(`Report ${status.toLowerCase()}`, "success");
        setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update report", "error");
      }
    } catch {
      toast("Failed to update report", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveWithAction = (id: string, action: string) => {
    const note = prompt(t("adminReports.adminNotePrompt"));
    updateReport(id, "RESOLVED", note || undefined, action);
  };

  const filtered = filter === "all" ? reports : reports.filter(r => r.status === filter);

  const statusCounts = {
    all: reports.length,
    PENDING: reports.filter(r => r.status === "PENDING").length,
    RESOLVED: reports.filter(r => r.status === "RESOLVED").length,
    DISMISSED: reports.filter(r => r.status === "DISMISSED").length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("adminReports.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{reports.length} {t("adminReports.total")} · {statusCounts.PENDING} {t("adminReports.pendingReview")}</p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "PENDING", "RESOLVED", "DISMISSED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? f === "PENDING" ? "bg-amber-500 text-white" : f === "RESOLVED" ? "bg-emerald-600 text-white" : f === "DISMISSED" ? "bg-slate-500 text-white" : "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? t("adminReports.all") : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">({statusCounts[f]})</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">{t("adminReports.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900">{t("adminReports.noReports")}</p>
            <p className="text-sm text-slate-500">{t("adminReports.allClear")}</p>
          </div>
        ) : filtered.map((r) => (
          <Card key={r.id} className={r.status === "PENDING" ? "border-amber-200 bg-amber-50/30" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={r.status === "PENDING" ? "warning" : r.status === "RESOLVED" ? "success" : "default"}>{r.status}</Badge>
                    <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900">{r.reason.replace(/_/g, " ")}</h3>
                  {r.description && <p className="text-sm text-slate-600 mt-1">{r.description}</p>}

                  {/* Reporter & Property Info */}
                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                    <span>{t("adminReports.reportedBy")} <strong className="text-slate-700">{r.reporter?.firstName} {r.reporter?.lastName}</strong></span>
                    {r.property && (
                      <span className="flex items-center gap-1">
                        {t("adminReports.property")} <strong className="text-slate-700">{r.property.title}</strong>
                        <a href={`/rent/houses/${r.property.slug}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                          <ExternalLink className="h-3 w-3 inline" />
                        </a>
                      </span>
                    )}
                    {r.property && <span>{t("adminReports.price")} {formatPrice(r.property.price)}</span>}
                    {r.property && <span>{t("adminReports.location")} {r.property.locationDistrict}</span>}
                  </div>

                  {r.adminNote && (
                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-600">
                      <strong>{t("adminReports.adminNote")}</strong> {r.adminNote}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {r.status === "PENDING" && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => updateReport(r.id, "RESOLVED")}
                        disabled={actionLoading === r.id + "RESOLVED"}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> {t("adminReports.resolve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateReport(r.id, "DISMISSED")}
                        disabled={actionLoading === r.id + "DISMISSED"}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> {t("adminReports.dismiss")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => handleResolveWithAction(r.id, "HIDE")}
                        disabled={actionLoading === r.id + "RESOLVED"}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" /> {t("adminReports.hideListing")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(t("adminReports.removeConfirm"))) {
                            handleResolveWithAction(r.id, "REMOVE");
                          }
                        }}
                        disabled={actionLoading === r.id + "RESOLVED"}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> {t("adminReports.remove")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
