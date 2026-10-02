"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PropertyCard } from "@/components/ui/property-card";
import { CompareTray } from "@/components/ui/compare-tray";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function SavedPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/favorites")
      .then(r => {
        if (r.status === 401) { window.location.href = "/login"; return null; }
        return r.json();
      })
      .then(d => { if (d) setFavorites(d.favorites || []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900">My saved properties</h1>
        <p className="text-sm text-slate-500 mt-1">
          {favorites.length === 0 ? "Tap the heart on any property to keep it here." : `${favorites.length} saved`}
        </p>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-7 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<Heart className="h-12 w-12" />}
              title="Nothing saved yet"
              description="Browse listings and tap the heart to build your shortlist."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {favorites.map((p: any) => (
              <PropertyCard
                key={p.id}
                property={p}
                initialSaved
                onToggleFavorite={(id, saved) => {
                  if (!saved) setFavorites(prev => prev.filter(x => x.id !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
      <CompareTray />
    </PublicLayout>
  );
}
