"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Home, CreditCard, MapPin, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

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
    { name: "Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Listings", href: "/admin/listings", icon: Home },
    { name: "Payments", href: "/admin/payments", icon: CreditCard },
    { name: "Reports", href: "/admin/reports", icon: Shield },
    { name: "Locations", href: "/admin/locations", icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex">
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-slate-900 text-white">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", pathname === item.href ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800")}>
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-slate-800">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="lg:ml-64 flex-1">
          <div className="px-6 lg:px-8 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
