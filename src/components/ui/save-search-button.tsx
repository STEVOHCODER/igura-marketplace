"use client";
import { useState } from "react";
import { BellPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** Saves the current listing filters as a named search with live match
 *  counts. The query object mirrors the API filter subset. */
export function SaveSearchButton({ marketplace, filters }: { marketplace: string; filters: Record<string, string> }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    const query: Record<string, string> = {};
    for (const k of ["q", "district", "minPrice", "maxPrice", "bedroomsMin"]) {
      if (filters[k]) query[k] = filters[k];
    }
    if (Object.keys(query).length === 0) {
      toast("Add at least one filter before saving", "error");
      return;
    }
    const name = window.prompt("Name this search (e.g. 3-bed Kicukiro under 800k):", query.q || query.district || marketplace);
    if (!name || !name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), marketplace, query }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast("Search saved — new matches will be flagged here", "success");
      } else if (res.status === 401) {
        toast("Sign in to save searches", "error");
      } else {
        toast(data.error || "Could not save search", "error");
      }
    } catch {
      toast("Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={save} disabled={busy} loading={busy}>
      <BellPlus className="h-4 w-4 mr-1.5" />
      Save search
    </Button>
  );
}
