"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

function listingHref(marketplace: string, slug: string): string {
  if (marketplace === "Plot Selling VIP") return `/plots/${slug}`;
  if (marketplace === "House Selling VVIP") return `/sell/houses/${slug}`;
  return `/rent/houses/${slug}`;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/leads")
      .then(r => r.json())
      .then(d => setLeads(d?.leads || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
      <p className="text-slate-500 text-sm mt-1 mb-6">
        People who paid to reveal your contact details — newest first.
      </p>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="No leads yet"
          description="When someone reveals your number on a listing, they appear here with their contact."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((l: any) => (
            <Card key={l.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{l.buyerName}</p>
                  <p className="text-sm text-slate-500 truncate">
                    interested in{" "}
                    <Link href={listingHref(l.marketplace, l.propertySlug)} className="text-emerald-600 hover:underline">
                      {l.propertyTitle}
                    </Link>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString("en-RW") : ""} · {Number(l.amount).toLocaleString()} RWF paid
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="success">paid lead</Badge>
                  {l.buyerPhone && (
                    <a
                      href={`tel:${l.buyerPhone}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:underline"
                    >
                      <Phone className="h-4 w-4" /> {l.buyerPhone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
