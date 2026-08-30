"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Search, UserCheck, CreditCard, Key } from "lucide-react";
import { useI18n } from "@/i18n";

export default function HowItWorksPage() {
  const { t } = useI18n();

  const steps = [
    {
      icon: Search,
      title: t("howItWorks.browse"),
      description: t("howItWorks.browseDesc"),
      color: "emerald",
    },
    {
      icon: UserCheck,
      title: t("howItWorks.contact"),
      description: t("howItWorks.contactDesc"),
      color: "blue",
    },
    {
      icon: CreditCard,
      title: t("howItWorks.choose"),
      description: t("howItWorks.chooseDesc"),
      color: "purple",
    },
    {
      icon: Key,
      title: t("howItWorks.close"),
      description: t("howItWorks.closeDesc"),
      color: "amber",
    },
  ];

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t("howItWorks.title")}</h1>
        <p className="text-lg text-slate-600 mb-12">
          {t("howItWorks.subtitle")}
        </p>

        <div className="space-y-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-6 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`p-3 rounded-xl ${
                step.color === "emerald" ? "bg-emerald-100" :
                step.color === "blue" ? "bg-blue-100" :
                step.color === "purple" ? "bg-purple-100" :
                "bg-amber-100"
              }`}>
                <step.icon className={`w-6 h-6 ${
                  step.color === "emerald" ? "text-emerald-600" :
                  step.color === "blue" ? "text-blue-600" :
                  step.color === "purple" ? "text-purple-600" :
                  "text-amber-600"
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-slate-400">{t("howItWorks.step")} {i + 1}</span>
                  <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                </div>
                <p className="text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
