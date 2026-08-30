"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { useI18n } from "@/i18n";

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/locations")
      .then(r => r.json())
      .then(d => setLocations(d?.locations || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("adminLocations.title")}</h1>
      <p className="text-slate-500 mb-6">{t("adminLocations.subtitle")}</p>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminLocations.country")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminLocations.district")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminLocations.sector")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminLocations.cell")}</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">{t("adminLocations.village")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t("adminLocations.loading")}</td></tr>
                ) : locations.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t("adminLocations.noLocations")}</td></tr>
                ) : locations.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="px-4 py-2">{l.country}</td>
                    <td className="px-4 py-2">{l.district || "—"}</td>
                    <td className="px-4 py-2">{l.sector || "—"}</td>
                    <td className="px-4 py-2">{l.cell || "—"}</td>
                    <td className="px-4 py-2">{l.village || "—"}</td>
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
