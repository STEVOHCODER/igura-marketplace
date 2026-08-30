"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { useI18n } from "@/i18n";

export default function TermsPage() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">{t("terms.title")}</h1>
        <p className="text-sm text-slate-500 mb-8">{t("terms.updated")}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.acceptance")}</h2>
            <p className="text-slate-600">
              {t("terms.acceptanceDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.accounts")}</h2>
            <p className="text-slate-600">
              {t("terms.accountsDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.listings")}</h2>
            <p className="text-slate-600">
              {t("terms.listingsDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.pricing")}</h2>
            <p className="text-slate-600">
              {t("terms.pricingDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.conduct")}</h2>
            <p className="text-slate-600">
              {t("terms.conductDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.liability")}</h2>
            <p className="text-slate-600">
              {t("terms.liabilityDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("terms.changes")}</h2>
            <p className="text-slate-600">
              {t("terms.changesDesc")}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
