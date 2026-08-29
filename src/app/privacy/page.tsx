import { PublicLayout } from "@/components/layout/public-layout";

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last updated: August 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
            <p className="text-slate-600">
              We collect information you provide directly: name, email, phone number, and property listing details. We also collect usage data such as pages visited and search queries.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600">
              Your information is used to: provide and improve the Platform, process payments, verify listings, communicate with you about your account, and send relevant notifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. Information Sharing</h2>
            <p className="text-slate-600">
              We do not sell your personal information. Property contact details are shared with potential tenants/buyers when they view a listing. We may share data with payment processors (Flutterwave) for transaction purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Data Security</h2>
            <p className="text-slate-600">
              We implement industry-standard security measures including encryption, secure authentication, and regular security audits. However, no method of transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Data Retention</h2>
            <p className="text-slate-600">
              We retain your information for as long as your account is active. You may request deletion of your account and associated data by contacting support@igura.rw.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. Your Rights</h2>
            <p className="text-slate-600">
              You have the right to access, correct, or delete your personal data. You may also opt out of non-essential communications at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Contact</h2>
            <p className="text-slate-600">
              For privacy-related inquiries, contact us at privacy@igura.rw or through our <a href="/contact" className="text-emerald-600 hover:underline">contact page</a>.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
