"use client";
import { useEffect, useState } from "react";
import { GitCompare } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export const COMPARE_KEY = "igura-compare-ids";
export const COMPARE_MAX = 4;

export function readCompareIds(): string[] {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

/** Compare checkbox overlay for property cards. Tray state lives in
 *  localStorage so comparing needs no account and no schema. */
export function CompareButton({ propertyId }: { propertyId: string }) {
  const [inTray, setInTray] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setInTray(readCompareIds().includes(propertyId));
    const onChange = () => setInTray(readCompareIds().includes(propertyId));
    window.addEventListener("igura-compare-change", onChange);
    return () => window.removeEventListener("igura-compare-change", onChange);
  }, [propertyId]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const ids = readCompareIds();
    if (ids.includes(propertyId)) {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(ids.filter((x) => x !== propertyId)));
    } else {
      if (ids.length >= COMPARE_MAX) {
        toast(`Compare holds ${COMPARE_MAX} at a time — remove one first`, "error");
        return;
      }
      localStorage.setItem(COMPARE_KEY, JSON.stringify([...ids, propertyId]));
      toast("Added to compare", "success");
    }
    window.dispatchEvent(new Event("igura-compare-change"));
  };

  return (
    <button
      onClick={toggle}
      aria-label={inTray ? "Remove from compare" : "Add to compare"}
      title={inTray ? "Remove from compare" : "Add to compare"}
      className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm transition-colors ${
        inTray ? "bg-emerald-600 text-white" : "bg-white/95 text-slate-600 hover:text-emerald-600"
      }`}
    >
      <GitCompare className="h-4 w-4" />
    </button>
  );
}
