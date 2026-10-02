"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GitCompare, X } from "lucide-react";
import { COMPARE_KEY, COMPARE_MAX, readCompareIds } from "./compare-button";

/** Floating tray that appears whenever the compare selection is non-empty. */
export function CompareTray() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    sync();
    window.addEventListener("igura-compare-change", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("igura-compare-change", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (ids.length === 0) return null;

  const clear = () => {
    localStorage.setItem(COMPARE_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event("igura-compare-change"));
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 text-white pl-4 pr-2 py-2 rounded-full shadow-2xl">
      <span className="text-sm font-medium whitespace-nowrap">
        <GitCompare className="h-4 w-4 inline mr-1.5 -mt-0.5" />
        {ids.length}/{COMPARE_MAX} to compare
      </span>
      <Link
        href={`/compare?ids=${ids.join(",")}`}
        className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
      >
        Compare
      </Link>
      <button onClick={clear} aria-label="Clear compare selection" className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
