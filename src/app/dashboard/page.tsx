"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, MapPin, CreditCard, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, draft: 0, unavailable: 0, total: 0 });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d?.user));
    fetch("/api/memberships").then(r => r.json()).then(d => setMemberships(d?.memberships || []));
    fetch("/api/properties?limit=1").then(r => r.json()).then(d => {
      setStats({ active: d?.active || 0, draft: d?.draft || 0, unavailable: d?.unavailable || 0, total: d?.total || 0 });
    });
  }, []);

  const commissionaireMemberships = memberships.filter((m: any) => m.plan?.role === "COMMISSIONAIRE" && m.status === "ACTIVE");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.firstName || "..."}!</h1>
          <p className="text-slate-500 mt-1">Manage your properties and memberships</p>
        </div>
        {commissionaireMemberships.length > 0 && (
          <Link href="/dashboard/listings/new">
            <Button><Plus className="h-4 w-4 mr-2" />New Listing</Button>
          </Link>
        )}
      </div>

      {/* Membership Status */}
      {memberships.length === 0 ? (
        <Card className="mb-8 border-emerald-200 bg-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-emerald-900">Get Started with Igura</h3>
                <p className="text-sm text-emerald-700 mt-1">Join a marketplace to start searching or listing properties.</p>
              </div>
              <Link href="/dashboard/memberships"><Button>Choose a Plan</Button></Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {memberships.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{m.plan?.marketplace?.displayName}</p>
                    <p className="font-medium">{m.plan?.displayName}</p>
                  </div>
                  <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "PENDING" ? "warning" : "danger"}>
                    {m.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Home className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-xs text-slate-500">Active Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.draft}</p>
                <p className="text-xs text-slate-500">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.unavailable}</p>
                <p className="text-xs text-slate-500">Unavailable</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{memberships.filter((m: any) => m.status === "ACTIVE").length}</p>
                <p className="text-xs text-slate-500">Active Memberships</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/listings" className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
          <Home className="h-8 w-8 text-emerald-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Manage Listings</h3>
          <p className="text-sm text-slate-500 mt-1">View, edit, and manage your property listings.</p>
        </Link>
        <Link href="/dashboard/memberships" className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
          <CreditCard className="h-8 w-8 text-emerald-600 mb-3" />
          <h3 className="font-semibold text-slate-900">Memberships</h3>
          <p className="text-sm text-slate-500 mt-1">View your marketplace memberships and upgrade.</p>
        </Link>
        <Link href="/dashboard/listings/new" className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
          <Plus className="h-8 w-8 text-emerald-600 mb-3" />
          <h3 className="font-semibold text-slate-900">New Listing</h3>
          <p className="text-sm text-slate-500 mt-1">Create a new property listing.</p>
        </Link>
      </div>
    </div>
  );
}
