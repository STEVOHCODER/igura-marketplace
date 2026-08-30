"use client";
import { useI18n } from "@/i18n";
import { Globe, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{locale}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 py-1 z-50 animate-fade-in-up">
          <button
            onClick={() => { setLocale("en"); setOpen(false); }}
            className={cn(
              "w-full text-left px-4 py-2.5 text-sm transition-colors",
              locale === "en" ? "text-emerald-700 bg-emerald-50 font-semibold" : "text-slate-700 hover:bg-slate-50"
            )}
          >
            English
          </button>
          <button
            onClick={() => { setLocale("rw"); setOpen(false); }}
            className={cn(
              "w-full text-left px-4 py-2.5 text-sm transition-colors",
              locale === "rw" ? "text-emerald-700 bg-emerald-50 font-semibold" : "text-slate-700 hover:bg-slate-50"
            )}
          >
            Kinyarwanda
          </button>
        </div>
      )}
    </div>
  );
}
