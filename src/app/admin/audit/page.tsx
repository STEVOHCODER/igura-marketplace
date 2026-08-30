"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Shield, User, Home, CreditCard, AlertTriangle, Filter, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminAuditPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterTarget, setFilterTarget] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", "30");
      if (filterType) params.set("actionType", filterType);
      if (filterTarget) params.set("targetType", filterTarget);

      const res = await fetch(`/api/admin/audit?${params.toString()}`);
      const data = await res.json();
      setActions(data?.actions || []);
      setActionTypes(data?.actionTypes || []);
      setTotalPages(data?.totalPages || 1);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAuditLog(); }, [page, filterType, filterTarget]);

  const getIcon = (actionType: string) => {
    if (actionType.includes("PROPERTY") || actionType.includes("LISTING")) return Home;
    if (actionType.includes("USER")) return User;
    if (actionType.includes("PAYMENT") || actionType.includes("REPORT")) return AlertTriangle;
    return Shield;
  };

  const getColor = (actionType: string) => {
    if (actionType.includes("ACTIVATED") || actionType.includes("ACTIVE") || actionType.includes("RESOLVED")) return "success";
    if (actionType.includes("SUSPENDED") || actionType.includes("DELETED") || actionType.includes("REMOVED")) return "danger";
    if (actionType.includes("PENDING") || actionType.includes("FLAGGED") || actionType.includes("HIDDEN")) return "warning";
    return "default";
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-slate-500 text-sm mt-1">Track all admin actions across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All Action Types</option>
          {actionTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={filterTarget}
          onChange={(e) => { setFilterTarget(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm bg-white"
        >
          <option value="">All Targets</option>
          <option value="USER">Users</option>
          <option value="PROPERTY">Properties</option>
          <option value="REPORT">Reports</option>
          <option value="PAYMENT">Payments</option>
          <option value="MEMBERSHIP">Memberships</option>
        </select>
        {(filterType || filterTarget) && (
          <Button variant="outline" size="sm" onClick={() => { setFilterType(""); setFilterTarget(""); setPage(1); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Audit Entries */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading audit log...</div>
        ) : actions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No audit entries found</div>
        ) : actions.map((a) => {
          const Icon = getIcon(a.actionType);
          const color = getColor(a.actionType);
          return (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    color === "success" ? "bg-emerald-100" : color === "danger" ? "bg-red-100" : color === "warning" ? "bg-amber-100" : "bg-slate-100"
                  }`}>
                    <Icon className={`h-4.5 w-4.5 ${
                      color === "success" ? "text-emerald-600" : color === "danger" ? "text-red-600" : color === "warning" ? "text-amber-600" : "text-slate-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={color as any}>{a.actionType.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-slate-400">{a.targetType}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">
                      <strong>{a.admin?.firstName} {a.admin?.lastName}</strong>
                      {" "}{a.actionType.toLowerCase().replace(/_/g, " ")}
                    </p>
                    {a.details && (
                      <div className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded p-2 font-mono max-h-20 overflow-auto">
                        {typeof a.details === "object" ? JSON.stringify(a.details, null, 2) : a.details}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{formatDate(a.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
