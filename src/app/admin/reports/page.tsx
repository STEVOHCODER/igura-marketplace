"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/reports")
      .then(r => r.json())
      .then(d => setReports(d?.reports || []))
      .finally(() => setLoading(false));
  }, []);

  const updateReport = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast("Report updated", "success");
        setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch {
      toast("Failed to update report", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Reports</h1>
      <p className="text-slate-500 mb-6">{reports.length} total reports</p>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No reports found</div>
        ) : reports.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "PENDING" ? "warning" : r.status === "RESOLVED" ? "success" : "default"}>{r.status}</Badge>
                    <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-medium text-slate-900">Reason: {r.reason.replace(/_/g, " ")}</p>
                  {r.description && <p className="text-sm text-slate-500 mt-1">{r.description}</p>}
                  <p className="text-xs text-slate-400 mt-1">Reported by: {r.reporter?.firstName} {r.reporter?.lastName}</p>
                  {r.property && <p className="text-xs text-slate-400">Property: {r.property.title}</p>}
                </div>
                <div className="flex gap-2">
                  {r.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "RESOLVED")}>Resolve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "DISMISSED")}>Dismiss</Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
