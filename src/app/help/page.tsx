"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { Search, UserPlus, Home, CreditCard, Shield, AlertCircle } from "lucide-react";
import { useI18n } from "@/i18n";

export default function HelpPage() {
  const { t } = useI18n();

  const faqs = [
    {
      icon: Search,
      question: t("help.q1"),
      answer: t("help.a1"),
    },
    {
      icon: UserPlus,
      question: t("help.q2"),
      answer: t("help.a2"),
    },
    {
      icon: Home,
      question: t("help.q3"),
      answer: t("help.a3"),
    },
    {
      icon: CreditCard,
      question: t("help.q4"),
      answer: t("help.a4"),
    },
    {
      icon: Shield,
      question: t("help.q5"),
      answer: t("help.a5"),
    },
    {
      icon: AlertCircle,
      question: t("help.q6"),
      answer: t("help.a6"),
    },
  ];

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">{t("help.title")}</h1>
        <p className="text-lg text-slate-600 mb-12">
          {t("help.subtitle")}
        </p>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg"><faq.icon className="w-5 h-5 text-emerald-600" /></div>
                <h3 className="text-lg font-semibold text-slate-900">{faq.question}</h3>
              </div>
              <p className="text-slate-600 ml-10">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600">{t("help.stillQuestions")}</p>
          <a href="/contact" className="text-emerald-600 font-semibold hover:underline">{t("help.contactSupport")}</a>
        </div>
      </div>
    </PublicLayout>
  );
}
