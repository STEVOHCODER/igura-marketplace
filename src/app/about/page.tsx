"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Shield, MapPin, Users, Heart } from "lucide-react";
import { useI18n } from "@/i18n";

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">{t("about.title")}</h1>
        <p className="text-lg text-slate-600 mb-8">
          {t("about.desc")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl"><Shield className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("about.verifiedListings")}</h3>
              <p className="text-slate-600">{t("about.verifiedListingsDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl"><MapPin className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("about.nationwide")}</h3>
              <p className="text-slate-600">{t("about.nationwideDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-xl"><Users className="w-6 h-6 text-purple-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("about.trustedCommunity")}</h3>
              <p className="text-slate-600">{t("about.trustedCommunityDesc")}</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 rounded-xl"><Heart className="w-6 h-6 text-rose-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("about.builtForRwanda")}</h3>
              <p className="text-slate-600">{t("about.builtForRwandaDesc")}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t("about.ourMission")}</h2>
          <p className="text-slate-600">
            {t("about.missionDesc")}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
