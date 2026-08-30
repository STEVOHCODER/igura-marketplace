"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Home, CreditCard, Shield, TrendingUp, TrendingDown, Eye, Clock, AlertTriangle, DollarSign, ArrowUpRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">{t("adminDash.title")}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-16 bg-slate-100 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <div className="text-center py-12 text-slate-500">Failed to load stats</div>;

  const statCards = [
    { label: t("adminDash.totalUsers"), value: stats.users?.total, sub: `+${stats.users?.new30d} ${t("adminDash.thisMonth")}`, icon: Users, color: "emerald", href: "/admin/users" },
    { label: t("adminDash.activeListings"), value: stats.listings?.active, sub: `${stats.listings?.pending} ${t("adminDash.pendingReview")}`, icon: Home, color: "blue", href: "/admin/listings" },
    { label: t("adminDash.totalRevenue"), value: formatPrice(stats.revenue?.total), sub: `${formatPrice(stats.revenue?.last30d)} ${t("adminDash.last30d")}`, icon: DollarSign, color: "amber", href: "/admin/payments" },
    { label: t("adminDash.pendingReports"), value: stats.reports?.pending, sub: `${stats.reports?.total} ${t("adminDash.totalReports")}`, icon: Shield, color: "red", href: "/admin/reports" },
    { label: t("adminDash.successfulPayments"), value: stats.payments?.successful, sub: `${stats.payments?.failed} ${t("adminDash.failed")}`, icon: CreditCard, color: "green", href: "/admin/payments" },
    { label: t("adminDash.activeMemberships"), value: stats.memberships?.active, sub: `${stats.memberships?.total} ${t("adminDash.total")}`, icon: TrendingUp, color: "purple", href: "/admin/users" },
    { label: t("adminDash.revenue7d"), value: formatPrice(stats.revenue?.last7d), sub: t("adminDash.last7days"), icon: BarChart3, color: "cyan", href: "/admin/payments" },
    { label: t("adminDash.draftListings"), value: stats.listings?.draft, sub: t("adminDash.notPublished"), icon: Clock, color: "orange", href: "/admin/listings" },
  ];

  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    cyan: "bg-cyan-100 text-cyan-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("adminDash.title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("adminDash.subtitle")}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorMap[c.color]}`}>
                    <c.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                    <p className="text-sm text-slate-500">{c.label}</p>
                    {c.sub && <p className="text-xs text-slate-400">{c.sub}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Marketplace */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("adminDash.revenueByMarketplace")}</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(stats.revenue?.byMarketplace || {}).length === 0 ? (
              <p className="text-slate-500 text-sm">{t("adminDash.noRevenue")}</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.revenue?.byMarketplace || {}).map(([name, amount]) => {
                  const total = stats.revenue?.total || 1;
                  const pct = Math.round(((amount as number) / total) * 100);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{name}</span>
                        <span className="text-sm font-semibold text-slate-900">{formatPrice(amount as number)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("adminDash.monthlyRevenue")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats.revenue?.monthly || []).map((m: any, i: number) => {
                const maxRevenue = Math.max(...(stats.revenue?.monthly || []).map((x: any) => x.revenue), 1);
                const pct = Math.round((m.revenue / maxRevenue) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-16">{m.month}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 relative">
                      <div className="bg-emerald-500 h-4 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 5)}%` }}>
                        {pct > 20 && <span className="text-[10px] font-medium text-white">{formatPrice(m.revenue)}</span>}
                      </div>
                    </div>
                    {pct <= 20 && <span className="text-xs text-slate-600">{formatPrice(m.revenue)}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Viewed Listings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("adminDash.topListings")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.topListings || []).length === 0 ? (
              <p className="text-slate-500 text-sm">{t("adminDash.noListings")}</p>
            ) : (
              <div className="space-y-3">
                {stats.topListings.map((l: any, i: number) => (
                  <div key={l.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-300 w-5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{l.title}</p>
                      <p className="text-xs text-slate-500">{l.locationDistrict} · {formatPrice(l.price)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="text-sm">{l.viewCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Admin Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("adminDash.recentActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.recentActions || []).length === 0 ? (
              <p className="text-slate-500 text-sm">{t("adminDash.noActivity")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActions.slice(0, 8).map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">{a.admin?.firstName} {a.admin?.lastName}</span>
                        {" "}{a.actionType.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
