"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Home, CreditCard, MapPin, Shield, ClipboardList, Settings, BarChart3, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (!d?.user || (d.user.role !== "ADMIN" && d.user.role !== "SUPER_ADMIN")) {
          window.location.href = "/dashboard";
          return;
        }
        setUser(d.user);
      })
      .catch(() => window.location.href = "/login");
  }, []);

  const nav = [
    { name: t("admin.overview"), href: "/admin", icon: LayoutDashboard },
    { name: t("admin.users"), href: "/admin/users", icon: Users },
    { name: t("admin.listings"), href: "/admin/listings", icon: Home },
    { name: t("admin.payments"), href: "/admin/payments", icon: CreditCard },
    { name: t("admin.reports"), href: "/admin/reports", icon: Shield },
    { name: t("admin.auditLog"), href: "/admin/audit", icon: ClipboardList },
    { name: t("admin.marketplaces"), href: "/admin/marketplaces", icon: Settings },
    { name: t("admin.locations"), href: "/admin/locations", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-bold">{t("admin.adminPanel")}</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
              )}>
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-slate-800 space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800">
              {t("admin.backToDashboard")}
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 w-full"
            >
              <LogOut className="h-5 w-5" />
              {t("admin.signOut")}
            </button>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="font-bold">Admin</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/50" onClick={() => setMobileOpen(false)}>
            <div className="w-64 h-full bg-slate-900 text-white pt-16" onClick={(e) => e.stopPropagation()}>
              <nav className="px-3 py-4 space-y-1">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                  )}>
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="lg:ml-64 flex-1 pt-14 lg:pt-0">
          <div className="px-4 lg:px-8 py-6 lg:py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
