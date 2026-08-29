"use client";
import { useEffect, useState } from "react";
import { Users, Home, CreditCard, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminOverview() {
  const [stats, setStats] = useState({ users: 0, listings: 0, payments: 0, reports: 0 });

  useEffect(() => {
    // In production, these would be separate admin API endpoints
    Promise.all([
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([data]) => {
      if (data) setStats(data);
    });
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "emerald" },
    { label: "Total Listings", value: stats.listings, icon: Home, color: "blue" },
    { label: "Payments", value: stats.payments, icon: CreditCard, color: "amber" },
    { label: "Reports", value: stats.reports, icon: Shield, color: "red" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-lg bg-${c.color}-100 flex items-center justify-center`}>
                  <c.icon className={`h-6 w-6 text-${c.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-sm text-slate-500">{c.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
