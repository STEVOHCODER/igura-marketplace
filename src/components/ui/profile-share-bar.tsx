"use client";

import { useState } from "react";
import { Check, Copy, Globe, MessageCircle, Share2 } from "lucide-react";

/**
 * Share controls for an agent's public profile.
 *
 * This is the distribution mechanism the whole feature exists for: the agent
 * pastes one of these links into a WhatsApp status or a Facebook post and
 * sends traffic back to the site. WhatsApp is first because it is how the
 * target audience actually shares property photos today.
 */
export function ProfileShareBar({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState(false);

  // Resolved in the browser so the link is always the origin the visitor is
  // actually on - correct behind a preview deployment and in local dev.
  const [url, setUrl] = useState("");
  if (!url && typeof window !== "undefined") {
    setUrl(`${window.location.origin}/agent/${slug}`);
  }

  const shareText = `${name} — property listings on Igura`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some in-app browsers. Selecting the text is a
      // usable fallback, so at minimum the URL is on screen to copy by hand.
      window.prompt("Copy your profile link:", url);
    }
  }

  function whatsapp() {
    // wa.me requires a bare number, no + or spaces.
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${shareText}: ${url}`)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function facebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function nativeShare() {
    if (navigator.share) {
      navigator.share({ title: shareText, url }).catch(() => {});
    } else {
      copy();
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
      <p className="text-sm font-semibold text-slate-900">Share this page</p>
      <p className="mt-1 text-xs text-slate-600">
        Send this link to clients on WhatsApp or Facebook. Every listing below links straight to its
        contact details.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="profile-share-url">
          Profile link
        </label>
        <input
          id="profile-share-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full min-w-0 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#047857] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={whatsapp}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={facebook}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            <Globe className="h-4 w-4" /> Facebook
          </button>
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 sm:hidden"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
