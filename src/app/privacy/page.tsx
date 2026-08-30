"use client";

import { PublicLayout } from "@/components/layout/public-layout";
import { useI18n } from "@/i18n";

export default function PrivacyPage() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">{t("privacy.title")}</h1>
        <p className="text-sm text-slate-500 mb-8">{t("privacy.updated")}</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.collect")}</h2>
            <p className="text-slate-600">
              {t("privacy.collectDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.use")}</h2>
            <p className="text-slate-600">
              {t("privacy.useDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.sharing")}</h2>
            <p className="text-slate-600">
              {t("privacy.sharingDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.security")}</h2>
            <p className="text-slate-600">
              {t("privacy.securityDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.retention")}</h2>
            <p className="text-slate-600">
              {t("privacy.retentionDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.rights")}</h2>
            <p className="text-slate-600">
              {t("privacy.rightsDesc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t("privacy.contactTitle")}</h2>
            <p className="text-slate-600">
              {t("privacy.contactDesc")}
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
