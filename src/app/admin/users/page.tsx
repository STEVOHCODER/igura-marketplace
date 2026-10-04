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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [granting, setGranting] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", firstName: "", lastName: "", phone: "", password: "", role: "CLIENT" });
  /** Shown after a successful create: the link to hand over with the credentials. */
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const { toast } = useToast();
  const { t } = useI18n();

  const reloadUsers = () => {
    return fetch("/api/admin/users").then(r => r.json()).then(d => {
      setUsers(d?.users || []);
    });
  };

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
        await reloadUsers();
      }
    } catch {
      toast(t("adminUsers.failedRevoke"), "error");
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete ${email}? Their listings, payments and memberships go with the account. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast("User deleted", "success");
        setUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast(data.error || "Could not delete user", "error");
      }
    } catch {
      toast("Could not delete user", "error");
    }
  };

  const addUser = async () => {
    if (!newUser.email.trim() || !newUser.firstName.trim() || !newUser.lastName.trim()) {
      toast("Email, first and last name are required", "error");
      return;
    }
    if (!newUser.password || newUser.password.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newUser, phone: newUser.phone.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Show the shareable link straight away - this is what the admin hands
        // over with the credentials.
        const link = data.profileUrl
          ? `${window.location.origin}${data.profileUrl}`
          : null;
        setCreatedLink(link);
        toast(link ? "User created — copy their profile link below" : "User created", "success");
        setShowAdd(false);
        setNewUser({ email: "", firstName: "", lastName: "", phone: "", password: "", role: "CLIENT" });
        await reloadUsers();
      } else {
        toast(data.error || "Could not create user", "error");
      }
    } catch {
      toast("Could not create user", "error");
    } finally {
      setAdding(false);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.firstName.toLowerCase().includes(search.toLowerCase()) ||
      u.lastName.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "active" ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("adminUsers.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{users.length} {t("adminUsers.totalUsers")} · {roleCounts.ADMIN} {t("adminUsers.admins")} · {roleCounts.COMMISSIONAIRE} {t("adminUsers.commissionaires")} · {roleCounts.CLIENT} {t("adminUsers.clients")}</p>
        </div>
        <Button onClick={() => setShowAdd(v => !v)} variant={showAdd ? "outline" : "primary"}>+ Add user</Button>
      </div>

      {/* The handoff panel: created account's credentials plus the one link they
          share with clients. */}
      {createdLink && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">Send these to your commissionaire</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Share the sign-in link below so they can reach their dashboard.</li>
            <li>Give them the email and password you just set.</li>
            <li>Ask them to post their profile link on WhatsApp and Facebook.</li>
          </ol>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="new-user-profile-link">Profile link</label>
            <input
              id="new-user-profile-link"
              readOnly
              value={createdLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(createdLink);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  } catch {
                    window.prompt("Copy this link:", createdLink);
                  }
                }}
              >
                {copiedLink ? "Copied" : "Copy link"}
              </Button>
              <a
                href={createdLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-50"
              >
                Preview
              </a>
              <Button variant="outline" onClick={() => { setCreatedLink(null); setCopiedLink(false); }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="First name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="Last name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} placeholder="Phone (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password (min 8 chars)" type="password" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white">
                <option value="CLIENT">CLIENT</option>
                <option value="COMMISSIONAIRE">COMMISSIONAIRE</option>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="mt-3 flex justify-end">
              <Button onClick={addUser} disabled={adding} loading={adding}>Create user</Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder={t("adminUsers.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
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
                      <div className="flex gap-1 flex-wrap">
                        {(u.activePlans || []).map((name: string) => (
                          <Badge key={name} variant="success" className="text-[10px]">
                            {name}
                          </Badge>
                        ))}
                        {(!u.activePlans || u.activePlans.length === 0) && (
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(u.id, u.email)}
                          title="Delete user"
                        >
                          ✕
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
