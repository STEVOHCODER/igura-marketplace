"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Home, MapPin, CreditCard, Settings, LogOut, Menu, X, Plus, BarChart3, Bell, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  // Plans are fully built but not advertised during the free launch. Set
  // SHOW_PLANS=true to bring the memberships page back into the nav.
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user))
      .catch(() => window.location.href = "/login");
  }, []);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setShowPlans(!!data?.showPlans))
      .catch(() => setShowPlans(false));
  }, []);

  const commissionaireNav = [
    { name: t("dash.overview"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("dash.myListings"), href: "/dashboard/listings", icon: Home },
    { name: t("dash.newListing"), href: "/dashboard/listings/new", icon: Plus },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    { name: "Leads", href: "/dashboard/leads", icon: Users },
    ...(showPlans ? [{ name: t("dash.memberships"), href: "/dashboard/memberships", icon: CreditCard }] : []),
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  const clientNav = [
    { name: t("dash.overview"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("dash.searchHouses"), href: "/rent/houses", icon: Home },
    { name: t("dash.searchPlots"), href: "/plots", icon: MapPin },
    ...(showPlans ? [{ name: t("dash.memberships"), href: "/dashboard/memberships", icon: CreditCard }] : []),
    { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  ];

  const navigation = user?.role === "COMMISSIONAIRE" ? commissionaireNav : clientNav;

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#faf8f4]">
      {/* Mobile sidebar - glass style */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-[#fffdfb]/90 border-r border-[#e8e1d8] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">I</span>
                </div>
                <span className="text-lg font-bold text-[#1c1917]">Igura</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="text-[#a8a29e]"><X className="h-5 w-5" /></button>
            </div>
            <nav className="space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    pathname === item.href ? "bg-[#ecfdf5] text-[#065f46]" : "text-[#6b625b] hover:bg-[#faf8f4]"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#b91c1c] hover:bg-red-50 w-full mt-4">
              <LogOut className="h-5 w-5" />
              {t("dash.logout")}
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar - glass style */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#fffdfb]/90 border-r border-[#e8e1d8] backdrop-blur-sm">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[#e8e1d8]">
            <div className="h-8 w-8 rounded-lg bg-[#047857] flex items-center justify-center">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <span className="text-lg font-bold text-[#1c1917]">Igura</span>
            <span className="ml-1 text-xs bg-[#d1fae5] text-[#065f46] px-2 py-0.5 rounded-full">Dashboard</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href ? "bg-[#ecfdf5] text-[#065f46]" : "text-[#6b625b] hover:bg-[#faf8f4]"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-[#e8e1d8]">
            {user && (
              <div className="px-3 py-2 text-sm">
                <div className="font-medium text-[#1c1917]">{user.firstName} {user.lastName}</div>
                <div className="text-[#6b625b] text-xs">{user.email}</div>
              </div>
            )}
            <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#b91c1c] hover:bg-red-50 w-full">
              <LogOut className="h-5 w-5" />
              {t("dash.logout")}
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:ml-64 flex-1">
          <div className="lg:hidden flex items-center gap-4 px-4 py-3 bg-[#fffdfb]/90 border-b border-[#e8e1d8] backdrop-blur-sm">
            <button onClick={() => setSidebarOpen(true)} className="text-[#6b625b]"><Menu className="h-5 w-5" /></button>
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#047857] flex items-center justify-center">
                <span className="text-white font-bold text-xs">I</span>
              </div>
              <span className="font-bold text-[#1c1917]">Dashboard</span>
            </Link>
          </div>
          <div className="p-6 lg:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
