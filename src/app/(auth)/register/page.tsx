"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Eye, EyeOff, ArrowRight, Home, MapPin, Briefcase, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/i18n";

type Step = "role" | "account";

export default function RegisterPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("role");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"COMMISSIONAIRE" | "CLIENT" | null>(null);
  const [marketplace, setMarketplace] = useState<"House Rental" | "Plot Selling VIP" | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleRoleSelect = (r: "COMMISSIONAIRE" | "CLIENT") => {
    setRole(r);
    setStep("account");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!role || !marketplace) {
      setErrors({ general: t("register.selectRole") });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: t("register.passwordMismatch") });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          role,
          marketplace,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else toast(data.error || t("register.error"), "error");
        return;
      }

      toast(t("register.success"), "success");
      router.push("/dashboard/memberships");
    } catch {
      toast(t("register.wrong"), "error");
    } finally {
      setLoading(false);
    }
  };

  const commissionairePlans = [
    { marketplace: "House Rental" as const, price: 5000, features: ["10 active listings", "3 images per listing", "Manage properties", "Contact leads"] },
    { marketplace: "Plot Selling VIP" as const, price: 20000, features: ["10 active listings", "3 images per listing", "Manage plots", "Premium placement"] },
  ];

  const clientPlans = [
    { marketplace: "House Rental" as const, price: 2000, features: ["Search all houses", "View full listings", "Contact owners directly", "Save favorites"] },
    { marketplace: "Plot Selling VIP" as const, price: 15000, features: ["Search all plots", "View full listings", "Contact owners directly", "Save favorites"] },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/30 border border-slate-100 p-8">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <svg className="h-9 w-auto" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="regLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <rect x="2" y="4" width="40" height="40" rx="8" fill="url(#regLogoGrad)" />
            <path d="M14 14 L14 34 L28 34" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="32" cy="14" r="3" fill="white" opacity="0.9" />
            <text x="50" y="33" fontFamily="Inter, system-ui, sans-serif" fontSize="26" fontWeight="700" fill="#0f172a">Igura</text>
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{t("register.createAccount")}</h1>
        <p className="text-sm text-slate-500 mt-1.5">{t("register.subtitle")}</p>
      </div>

      {step === "role" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 text-center mb-6">{t("register.howUse")}</p>

          <button
            onClick={() => handleRoleSelect("COMMISSIONAIRE")}
            className="w-full p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <Briefcase className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t("register.commissionaire")}</h3>
                <p className="text-sm text-slate-500">{t("register.commissionaireDesc")}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect("CLIENT")}
            className="w-full p-5 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{t("register.client")}</h3>
                <p className="text-sm text-slate-500">{t("register.clientDesc")}</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {step === "account" && (
        <>
          <button onClick={() => setStep("role")} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
            &larr; {t("register.changeRole")}
          </button>

          <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500">{t("register.signingUpAs")}</p>
            <p className="font-semibold text-slate-900">{role === "COMMISSIONAIRE" ? t("register.commissionaire") : t("register.client")}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-3">{t("register.chooseMarketplace")}</p>
            <div className="grid grid-cols-2 gap-3">
              {(role === "COMMISSIONAIRE" ? commissionairePlans : clientPlans).map((plan) => (
                <button
                  key={plan.marketplace}
                  onClick={() => setMarketplace(plan.marketplace)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    marketplace === plan.marketplace
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {plan.marketplace === "House Rental" ? (
                      <Home className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <MapPin className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-sm font-medium text-slate-900">
                      {plan.marketplace === "House Rental" ? t("register.houseRental") : t("register.plotSelling")}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{plan.price.toLocaleString()} RWF</p>
                  <ul className="mt-2 space-y-1">
                    {plan.features.slice(0, 2).map((f, i) => (
                      <li key={i} className="text-xs text-slate-500">- {f}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {marketplace && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="firstName"
                  label={t("register.firstName")}
                  placeholder={t("register.firstNamePlaceholder")}
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  error={errors.firstName}
                  required
                />
                <Input
                  id="lastName"
                  label={t("register.lastName")}
                  placeholder={t("register.lastNamePlaceholder")}
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  error={errors.lastName}
                  required
                />
              </div>
              <Input
                id="email"
                label={t("register.email")}
                type="email"
                placeholder={t("register.emailPlaceholder")}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={errors.email}
                required
              />
              <Input
                id="phone"
                label={t("register.phone")}
                type="tel"
                placeholder={t("register.phonePlaceholder")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                error={errors.phone}
                required
              />
              <div className="relative">
                <Input
                  id="password"
                  label={t("register.password")}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("register.passwordPlaceholder")}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  error={errors.password}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                id="confirmPassword"
                label={t("register.confirmPassword")}
                type="password"
                placeholder={t("register.confirmPasswordPlaceholder")}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                error={errors.confirmPassword}
                required
              />

              <Button type="submit" loading={loading} className="w-full" size="lg">
                <UserPlus className="h-4 w-4 mr-1.5" />
                {t("register.createPay")}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          )}
        </>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          {t("register.hasAccount")}{" "}
          <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
            {t("register.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
