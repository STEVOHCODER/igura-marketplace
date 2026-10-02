"use client";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";

/** Heart overlay for property cards. Stops the card link from firing. */
export function FavoriteButton({ propertyId, initialSaved, onToggle }: { propertyId: string; initialSaved?: boolean; onToggle?: (saved: boolean) => void }) {
  const [saved, setSaved] = useState(!!initialSaved);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        const res = await fetch(`/api/favorites?propertyId=${encodeURIComponent(propertyId)}`, { method: "DELETE" });
        if (res.ok) {
          setSaved(false);
          onToggle?.(false);
        } else if (res.status === 401) {
          toast("Sign in to save properties", "error");
        }
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId }),
        });
        if (res.ok) {
          setSaved(true);
          onToggle?.(true);
          toast("Saved to your properties", "success");
        } else if (res.status === 401) {
          toast("Sign in to save properties", "error");
        } else {
          toast("Could not save this property", "error");
        }
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from saved" : "Save property"}
      className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm transition-colors ${
        saved ? "bg-red-500 text-white" : "bg-white/95 text-slate-600 hover:text-red-500"
      }`}
    >
      <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
