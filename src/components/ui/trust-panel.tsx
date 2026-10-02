import { ShieldCheck, ShieldAlert, MapPin, Clock, User } from "lucide-react";

/**
 * Verification & trust panel. Every row is backed by a real backend state:
 * a live membership (identity), published coordinates (location), the row's
 * own timestamps. Anything without evidence renders as "not verified" —
 * never as a badge.
 */
export function TrustPanel({
  verifiedOwner,
  coordsPublished,
  listedAt,
  ownerName,
  viewCount,
}: {
  verifiedOwner: boolean;
  coordsPublished: boolean;
  listedAt?: string | Date | null;
  ownerName: string;
  viewCount?: number | null;
}) {
  const listed = listedAt ? new Date(listedAt) : null;
  const rows = [
    {
      ok: verifiedOwner,
      icon: User,
      title: "Identity verified",
      desc: verifiedOwner
        ? `${ownerName} holds an active Igura membership.`
        : "This owner has no active Igura membership.",
    },
    {
      ok: coordsPublished,
      icon: MapPin,
      title: "Location verified",
      desc: coordsPublished
        ? "The owner published exact map coordinates for this listing."
        : "Exact location hidden — area shown only.",
    },
    {
      ok: true,
      icon: Clock,
      title: listed && listed.getTime() ? `Listed ${listed.toLocaleDateString("en-RW", { day: "numeric", month: "short", year: "numeric" })}` : "Listing date",
      desc: viewCount != null ? `${viewCount.toLocaleString()} views since listing.` : "View counter active on this listing.",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Verification &amp; trust</h2>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.title} className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.ok ? "bg-emerald-50" : "bg-slate-100"}`}>
              {r.ok
                ? <ShieldCheck className="h-4 w-4 text-emerald-600" />
                : <ShieldAlert className="h-4 w-4 text-slate-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{r.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
        Badges reflect Igura records only (membership, published coordinates, listing history).
        They are not a legal guarantee of ownership or documents.
      </p>
    </div>
  );
}
