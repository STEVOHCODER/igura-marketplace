import { PublicLayout } from "@/components/layout/public-layout";
import { Search, UserPlus, Home, CreditCard, Shield, AlertCircle } from "lucide-react";

const faqs = [
  {
    icon: Search,
    question: "How do I search for properties?",
    answer: "Use the search bar on the House Rental or Plots & Land pages. You can filter by district, sector, property type, and price range.",
  },
  {
    icon: UserPlus,
    question: "How do I list my property?",
    answer: "Register an account, choose between Client or Commissionaire, and add your listing from the Dashboard. Commissionaires get higher listing limits.",
  },
  {
    icon: Home,
    question: "What types of properties can I list?",
    answer: "Igura supports two marketplaces: House Rental (apartments, villas, rooms, etc.) and Plot Selling VIP (residential, commercial, agricultural land).",
  },
  {
    icon: CreditCard,
    question: "What are the pricing plans?",
    answer: "House Client: 2,000 RWF. House Commissionaire: 5,000 RWF. Plot Client: 15,000 RWF. Plot Commissionaire: 20,000 RWF. Commissionaires can list up to 10 properties.",
  },
  {
    icon: Shield,
    question: "How are listings verified?",
    answer: "Our team reviews every listing before it goes live. We verify property ownership, location accuracy, and contact information.",
  },
  {
    icon: AlertCircle,
    question: "How do I report a suspicious listing?",
    answer: "Click the report button on any listing page or contact us at support@igura.rw. We investigate all reports within 24 hours.",
  },
];

export default function HelpPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Help Center</h1>
        <p className="text-lg text-slate-600 mb-12">
          Find answers to common questions about using Igura.
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
          <p className="text-slate-600">Still have questions?</p>
          <a href="/contact" className="text-emerald-600 font-semibold hover:underline">Contact our support team →</a>
        </div>
      </div>
    </PublicLayout>
  );
}
