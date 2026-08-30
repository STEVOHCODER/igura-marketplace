"use client";
import { useEffect, useState } from "react";
import { Search, UserCheck, UserX, Key, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [granting, setGranting] = useState<string | null>(null);
  const { toast } = useToast();

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
        toast("User status updated", "success");
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u));
      }
    } catch {
      toast("Failed to update user", "error");
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
        toast("Access granted successfully", "success");
        // Refresh users to show new membership
        const refreshed = await fetch("/api/admin/users").then(r => r.json());
        setUsers(refreshed?.users || []);
      } else {
        toast(data.error || "Failed to grant access", "error");
      }
    } catch {
      toast("Failed to grant access", "error");
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
        toast("Access revoked", "success");
        const refreshed = await fetch("/api/admin/users").then(r => r.json());
        setUsers(refreshed?.users || []);
      }
    } catch {
      toast("Failed to revoke access", "error");
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.firstName.toLowerCase().includes(search.toLowerCase()) ||
    u.lastName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Manage Users</h1>
      <p className="text-slate-500 mb-6">{users.length} total users</p>

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found</td></tr>
                ) : filtered.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.firstName} {u.lastName}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "ADMIN" ? "danger" : u.role === "COMMISSIONAIRE" ? "success" : u.role === "CLIENT" ? "warning" : "default"}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Suspended"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleUserStatus(u.id, u.isActive)}>
                          {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          const planId = prompt(`Grant access to which plan?\n\nAvailable plans:\n${plans.map(p => `${p.id}: ${p.displayName} (${p.marketplace?.displayName}) - ${p.role}`).join("\n")}`);
                          if (planId) grantAccess(u.id, planId);
                        }}>
                          <Key className="h-4 w-4" />
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
