"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, MapPin, LogIn, UserPlus, LayoutDashboard, LogOut, User, ChevronDown, Crown, Heart, BellRing } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function Navbar() {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/rent/houses", label: t("nav.houseRental"), icon: Home },
    { href: "/plots", label: t("nav.plotsLand"), icon: MapPin },
    { href: "/sell/houses", label: t("nav.houseSellingVvip"), icon: Crown },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/saved-searches", label: "Searches", icon: BellRing },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setUserMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 backdrop-blur-xl border-b border-[#e8e1d8]/60 shadow-sm shadow-[#1c1917]/5"
          : "bg-white border-b border-[#e8e1d8]"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <svg className="h-8 w-auto" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <rect x="2" y="4" width="40" height="40" rx="8" fill="url(#logoGrad)" />
              <path d="M14 14 L14 34 L28 34" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="32" cy="14" r="3" fill="white" opacity="0.9" />
              <text x="50" y="33" fontFamily="Inter, system-ui, sans-serif" fontSize="26" fontWeight="700" fill="#0f172a">Igura</text>
            </svg>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname.startsWith(link.href)
                    ? "bg-[#ecfdf5] text-[#065f46] shadow-sm shadow-emerald-100"
                    : "text-[#6b625b] hover:text-[#1c1917] hover:bg-[#f7f4ef]"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#6b625b] hover:text-[#1c1917] hover:bg-[#f7f4ef] transition-all"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t("nav.dashboard")}
                </Link>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#f7f4ef] transition-all"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-200">
                      <span className="text-xs font-bold text-white">
                        {getInitials(user.firstName, user.lastName)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[#1c1917]">{user.firstName}</span>
                    <ChevronDown className={cn("h-4 w-4 text-[#a8a29e] transition-transform", userMenuOpen && "rotate-180")} />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#fffdfb] rounded-xl shadow-xl shadow-[#1c1917]/10 border border-[#f2ede6] py-2 animate-fade-in-up z-50">
                      <div className="px-4 py-3 border-b border-[#f2ede6]">
                        <p className="text-sm font-semibold text-[#1c1917]">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-[#6b625b] mt-0.5">{user.email}</p>
                        <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ecfdf5] text-[#065f46] uppercase tracking-wide">
                          {user.role}
                        </span>
                      </div>
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#f7f4ef] transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4" /> {t("nav.dashboard")}
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#1c1917] hover:bg-[#f7f4ef] transition-colors"
                      >
                        <User className="h-4 w-4" /> {t("nav.profile")}
                      </Link>
                      <hr className="my-1 border-[#f2ede6]" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                      >
                        <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#6b625b] hover:text-[#1c1917] hover:bg-[#f7f4ef] transition-all"
                >
                  <LogIn className="h-4 w-4" />
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#047857] text-white hover:bg-[#ecfdf5]0 transition-all shadow-sm shadow-emerald-200"
                >
                  <UserPlus className="h-4 w-4" />
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-[#6b625b] hover:bg-[#f2ede6] transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          mobileOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-3 space-y-1 border-t border-[#e8e1d8] bg-white">
          <div className="flex justify-center mb-2">
            <LanguageSwitcher />
          </div>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-[#ecfdf5] text-[#065f46]"
                  : "text-[#6b625b] hover:bg-[#f7f4ef]"
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          ))}
          <hr className="my-2 border-[#e8e1d8]" />
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-3 mb-1">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {getInitials(user.firstName, user.lastName)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1c1917]">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-[#6b625b]">{user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-[#6b625b] hover:bg-[#f7f4ef]"
              >
                <LayoutDashboard className="h-5 w-5" /> {t("nav.dashboard")}
              </Link>
              <Link
                href="/dashboard/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-[#6b625b] hover:bg-[#f7f4ef]"
              >
                <User className="h-5 w-5" /> {t("nav.profile")}
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full"
              >
                <LogOut className="h-5 w-5" /> {t("nav.signOut")}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-medium text-[#6b625b] hover:bg-[#f7f4ef]"
              >
                <LogIn className="h-5 w-5" /> {t("nav.signIn")}
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold bg-[#047857] text-white hover:bg-[#ecfdf5]0 mt-1"
              >
                <UserPlus className="h-5 w-5" /> {t("nav.getStarted")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
