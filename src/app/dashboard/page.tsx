"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, MapPin, Plus, CreditCard, TrendingUp, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n";

export default function DashboardPage() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [showPlans, setShowPlans] = useState(false);
  const [stats, setStats] = useState({ active: 0, draft: 0, unavailable: 0, total: 0 });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d?.user));
    fetch("/api/properties?limit=1").then(r => r.json()).then(d => {
      setStats({ active: d?.active || 0, draft: d?.draft || 0, unavailable: d?.unavailable || 0, total: d?.total || 0 });
    });
  }, [pathname]);

  // Plans are not advertised during the free launch, so the memberships call
  // is skipped entirely unless SHOW_PLANS turns them back on.
  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(d => {
      if (!d?.showPlans) return;
      setShowPlans(true);
      fetch("/api/memberships").then(r => r.json()).then(m => setMemberships(m?.memberships || []));
    }).catch(() => {});
  }, []);

  const commissionaireMemberships = memberships.filter((m: any) => m.plan?.role === "COMMISSIONAIRE" && m.status === "ACTIVE");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 glass-card p-6 rounded-xl" style={{ backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1c1917]">{t("dash.welcome")} {user?.firstName || "..."}!</h1>
            <p className="text-[#6b625b] mt-1 text-sm">{t("dash.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "COMMISSIONAIRE" && (
              <Link href="/dashboard/listings/new">
                <Button variant="outline" className="px-4 py-2">
                  <Plus className="h-4 w-4 mr-2" /> {t("dash.newListing")}
                </Button>
              </Link>
            )}
            <Link href="/">
              <Button variant="outline">
                <LogOut className="h-4 w-4 mr-2" /> {t("dash.logout")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {showPlans && user?.role === "COMMISSIONAIRE" && commissionaireMemberships.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {commissionaireMemberships.map((m: any) => (
            <Card key={m.id} className="border border-[#a7f3d0] bg-[#ecfdf5]">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#6b625b]">{m.plan?.marketplace?.displayName}</p>
                    <p className="font-medium">{m.plan?.displayName}</p>
                  </div>
                  <Badge variant="success">{t("dash.active")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#d1fae5] flex items-center justify-center">
                <Home className="h-5 w-5 text-[#047857]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1c1917]">{stats.active}</p>
                <p className="text-xs text-[#6b625b]">{t("dash.activeListings")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#fee2e2] flex items-center justify-center">
                <MapPin className="h-5 w-5 text-[#b91c1c]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1c1917]">{stats.unavailable}</p>
                <p className="text-xs text-[#6b625b]">{t("dash.unavailable")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {showPlans && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-[#1d4ed8]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1c1917]">{memberships.filter((m: any) => m.status === "ACTIVE").length}</p>
                  <p className="text-xs text-[#6b625b]">{t("dash.activeMemberships")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {user?.role === "COMMISSIONAIRE" && (
          <>
            <Link href="/dashboard/listings" className="block p-6 bg-[#fffdfb] rounded-xl border border-[#e8e1d8] hover:border-emerald-300 hover:shadow-md transition-all">
              <Home className="h-8 w-8 text-[#047857] mb-3" />
              <h3 className="font-semibold text-[#1c1917]">{t("dash.manageListings")}</h3>
              <p className="text-sm text-[#6b625b] mt-1">{t("dash.manageListingsDesc")}</p>
            </Link>
            <Link href="/dashboard/listings/new" className="block p-6 bg-[#fffdfb] rounded-xl border border-[#e8e1d8] hover:border-emerald-300 hover:shadow-md transition-all">
              <Plus className="h-8 w-8 text-[#047857] mb-3" />
              <h3 className="font-semibold text-[#1c1917]">{t("dash.newListingCard")}</h3>
              <p className="text-sm text-[#6b625b] mt-1">{t("dash.newListingDesc")}</p>
            </Link>
          </>
        )}
        {user?.role === "CLIENT" && (
          <>
            <Link href="/rent/houses" className="block p-6 bg-[#fffdfb] rounded-xl border border-[#e8e1d8] hover:border-emerald-300 hover:shadow-md transition-all">
              <Home className="h-8 w-8 text-[#047857] mb-3" />
              <h3 className="font-semibold text-[#1c1917]">{t("dash.searchHousesCard")}</h3>
              <p className="text-sm text-[#6b625b] mt-1">{t("dash.searchHousesDesc")}</p>
            </Link>
            <Link href="/plots" className="block p-6 bg-[#fffdfb] rounded-xl border border-[#e8e1d8] hover:border-amber-300 hover:shadow-md transition-all">
              <MapPin className="h-8 w-8 text-amber-600 mb-3" />
              <h3 className="font-semibold text-[#1c1917]">{t("dash.searchPlotsCard")}</h3>
              <p className="text-sm text-[#6b625b] mt-1">{t("dash.searchPlotsDesc")}</p>
            </Link>
          </>
        )}
        <Link href="/dashboard/memberships" className="block p-6 bg-[#fffdfb] rounded-xl border border-[#e8e1d8] hover:border-emerald-300 hover:shadow-md transition-all">
          <CreditCard className="h-8 w-8 text-[#047857] mb-3" />
          <h3 className="font-semibold text-[#1c1917]">{t("dash.membershipsCard")}</h3>
          <p className="text-sm text-[#6b625b] mt-1">{t("dash.membershipsDesc")}</p>
        </Link>
      </div>
    </div>
  );
}
