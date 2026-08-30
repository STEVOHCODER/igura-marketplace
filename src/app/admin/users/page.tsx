"use client";
import { useEffect, useState } from "react";
import { Search, UserCheck, UserX, Shield, MoreVertical, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [granting, setGranting] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then(r => r.json()),
      fetch("/api/plans").then(r => r.json()),
    ]).then(([usersData, plansData]) => {
      setUsers(usersData?.users || []);
      setPlans(plansData?.plans || []);
    }).finally(() => setLoading(false));
  }, []);

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        toast(isActive ? t("adminUsers.userSuspended") : t("adminUsers.userActivated"), "success");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
      }
    } catch {
      toast(t("adminUsers.failedUpdate"), "error");
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast(`${t("adminUsers.roleChanged")} ${newRole}`, "success");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        setEditingRole(null);
      } else {
        const data = await res.json();
        toast(data.error || t("adminUsers.failedRole"), "error");
      }
    } catch {
      toast(t("adminUsers.failedRole"), "error");
    }
  };

  const grantAccess = async (userId: string, planId: string) => {
    setGranting(userId + planId);
    try {
      const res = await fetch("/api/admin/grant-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId, action: "activate" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast(t("adminUsers.accessGranted"), "success");
        const refreshed = await fetch("/api/admin/users").then(r => r.json());
        setUsers(refreshed?.users || []);
      } else {
        toast(data.error || t("adminUsers.failedGrant"), "error");
      }
    } catch {
      toast(t("adminUsers.failedGrant"), "error");
    } finally {
      setGranting(null);
    }
  };

  const revokeAccess = async (userId: string, planId: string) => {
    try {
      const res = await fetch("/api/admin/grant-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, planId, action: "revoke" }),
      });
      if (res.ok) {
        toast(t("adminUsers.accessRevoked"), "success");
        const refreshed = await fetch("/api/admin/users").then(r => r.json());
        setUsers(refreshed?.users || []);
      }
    } catch {
      toast(t("adminUsers.failedRevoke"), "error");
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = {
    all: users.length,
    ADMIN: users.filter(u => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length,
    COMMISSIONAIRE: users.filter(u => u.role === "COMMISSIONAIRE").length,
    CLIENT: users.filter(u => u.role === "CLIENT").length,
    USER: users.filter(u => u.role === "USER").length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("adminUsers.title")}</h1>
        <p className="text-slate-500 text-sm mt-1">{users.length} {t("adminUsers.totalUsers")} · {roleCounts.ADMIN} {t("adminUsers.admins")} · {roleCounts.COMMISSIONAIRE} {t("adminUsers.commissionaires")} · {roleCounts.CLIENT} {t("adminUsers.clients")}</p>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(["all", "ADMIN", "COMMISSIONAIRE", "CLIENT", "USER"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setRoleFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              roleFilter === f
                ? "bg-emerald-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? t("adminUsers.allRoles") : f.charAt(0) + f.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-70">({roleCounts[f]})</span>
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t("adminUsers.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.user")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.email")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.role")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.status")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.memberships")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminUsers.joined")}</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">{t("adminUsers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t("adminUsers.loading")}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{t("adminUsers.noUsers")}</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-emerald-700">
                            {u.firstName?.[0]}{u.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-400">{u.phone || t("adminUsers.noPhone")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      {editingRole === u.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            defaultValue={u.role}
                            onChange={(e) => changeRole(u.id, e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                          >
                            <option value="USER">USER</option>
                            <option value="CLIENT">CLIENT</option>
                            <option value="COMMISSIONAIRE">COMMISSIONAIRE</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          </select>
                          <button onClick={() => setEditingRole(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingRole(u.id)}
                          className="hover:bg-slate-100 rounded px-1 py-0.5 transition-colors"
                        >
                          <Badge variant={u.role === "ADMIN" || u.role === "SUPER_ADMIN" ? "danger" : u.role === "COMMISSIONAIRE" ? "success" : u.role === "CLIENT" ? "warning" : "default"}>
                            {u.role}
                          </Badge>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? t("adminUsers.active") : t("adminUsers.suspended")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {u.memberships?.map((m: any) => (
                          <Badge key={m.id} variant={m.status === "ACTIVE" ? "success" : m.status === "PENDING" ? "warning" : "default"} className="text-[10px]">
                            {m.plan?.marketplace?.displayName?.split(" ")[0]} {m.status}
                          </Badge>
                        ))}
                        {(!u.memberships || u.memberships.length === 0) && (
                          <span className="text-xs text-slate-400">{t("adminUsers.none")}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserStatus(u.id, u.isActive)}
                          title={u.isActive ? "Suspend user" : "Activate user"}
                        >
                          {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const planId = prompt(`${t("adminUsers.grantAccess")}${plans.map(p => `${p.id}: ${p.displayName} (${p.role}) - ${p.marketplace?.displayName}`).join("\n")}`);
                            if (planId) grantAccess(u.id, planId);
                          }}
                          title="Grant membership"
                        >
                          <Shield className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
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
