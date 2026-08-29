import { PublicLayout } from "@/components/layout/public-layout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: August 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-slate-600">
              By accessing and using Igura (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. User Accounts</h2>
            <p className="text-slate-600">
              You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials. Igura reserves the right to suspend accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Property Listings</h2>
            <p className="text-slate-600">
              All listings must be accurate and truthful. Property owners and commissionaires are responsible for the content of their listings. Igura reviews listings but does not guarantee the accuracy of third-party content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Pricing & Payments</h2>
            <p className="text-slate-600">
              Listing fees are non-refundable once a listing is published. Prices are displayed in Rwandan Francs (RWF). Payments are processed securely through Flutterwave.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Prohibited Conduct</h2>
            <p className="text-slate-600">
              Users may not: post fraudulent listings, impersonate others, spam other users, attempt to circumvent platform fees, or engage in any illegal activity through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Limitation of Liability</h2>
            <p className="text-slate-600">
              Igura acts as a marketplace connector and is not a party to any transaction between users. We are not liable for any disputes, damages, or losses arising from user interactions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Changes to Terms</h2>
            <p className="text-slate-600">
              Igura may update these terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
