"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { useI18n } from "@/i18n";

export default function ContactPage() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t("contact.title")}</h1>
        <p className="text-lg text-slate-600 mb-12">
          {t("contact.subtitle")}
        </p>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-3 bg-emerald-100 rounded-xl"><Mail className="w-6 h-6 text-emerald-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("contact.email")}</h3>
              <p className="text-slate-600">support@igura.rw</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-3 bg-blue-100 rounded-xl"><Phone className="w-6 h-6 text-blue-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("contact.phone")}</h3>
              <p className="text-slate-600">+250 788 000 000</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-3 bg-purple-100 rounded-xl"><MapPin className="w-6 h-6 text-purple-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("contact.location")}</h3>
              <p className="text-slate-600">{t("contact.kigali")}</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-3 bg-amber-100 rounded-xl"><MessageSquare className="w-6 h-6 text-amber-600" /></div>
            <div>
              <h3 className="font-semibold text-slate-900">{t("contact.responseTime")}</h3>
              <p className="text-slate-600">{t("contact.within24h")}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">{t("contact.sendMessage")}</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("contact.name")}</label>
              <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder={t("contact.namePlaceholder")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("contact.emailLabel")}</label>
              <input type="email" className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("contact.message")}</label>
              <textarea rows={4} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none" placeholder={t("contact.messagePlaceholder")} />
            </div>
            <button type="submit" className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">
              {t("contact.sendBtn")}
            </button>
          </form>
        </div>
      </div>
    </PublicLayout>
  );
}
