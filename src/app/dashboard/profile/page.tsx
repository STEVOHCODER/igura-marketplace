"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Lock, User } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

/** Mirrors the server rules in /api/auth/change-password so the user is told
 *  what is missing before a round trip, not after it. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Add at least one uppercase letter";
  if (!/[a-z]/.test(pw)) return "Add at least one lowercase letter";
  if (!/[0-9]/.test(pw)) return "Add at least one number";
  return null;
}

export default function ProfileSettingsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    address: "",
    district: "",
  });
  const [slug, setSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (res.ok) {
        setForm({
          firstName: data.user?.firstName || "",
          lastName: data.user?.lastName || "",
          phone: data.user?.phone || "",
          bio: data.profile?.bio || "",
          address: data.profile?.address || "",
          district: data.profile?.district || "",
        });
        setSlug(data.profile?.slug || null);
      }
    } catch {
      toast("Could not load your profile", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const shareUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/agent/${slug}` : "";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not save your profile", "error");
        return;
      }
      toast("Profile saved", "success");
      load();
    } catch {
      toast("Could not save your profile", "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    const problem = passwordProblem(pw.newPassword);
    if (problem) {
      setPwError(problem);
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      setPwError("The two new passwords do not match");
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Could not change your password");
        return;
      }
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Password changed", "success");
    } catch {
      setPwError("Could not change your password");
    } finally {
      setSavingPw(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your profile link:", shareUrl);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#6b625b]">Loading…</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1c1917]">My profile</h1>
        <p className="mt-1 text-sm text-[#6b625b]">
          This is what clients see on your public page.
        </p>
      </div>

      {/* Share link first: it is the thing they came here for. */}
      {slug && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1c1917]">
            <ExternalLink className="h-4 w-4 text-[#047857]" /> Your shareable link
          </h2>
          <p className="mt-1 text-xs text-[#6b625b]">
            Post this on WhatsApp or Facebook. It always points here, even if you change your name.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="my-profile-url">Profile link</label>
            <input
              id="my-profile-url"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 font-mono text-xs text-[#1c1917] focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-2">
              <Button type="button" onClick={copyLink} size="sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <a
                href={`/agent/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-xl border border-[#d6ccbf] bg-white px-3 py-2 text-sm font-semibold text-[#1c1917] hover:bg-[#f7f4ef]"
              >
                View
              </a>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1c1917]">
          <User className="h-5 w-5 text-[#047857]" /> {t("dash.profile") || "Profile details"}
        </h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-[#1c1917]">First name</span>
              <input
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                required
                maxLength={50}
                className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-[#1c1917]">Last name</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                required
                maxLength={50}
                className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              inputMode="tel"
              placeholder="+250 7XX XXX XXX"
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="mt-1 block text-xs text-[#a8a29e]">
              Shown to clients once they reveal a listing&rsquo;s contact.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">District</span>
            <input
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              placeholder="e.g. Gasabo"
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">About you</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              maxLength={500}
              placeholder="Tell clients what you help with and which areas you cover."
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="mt-1 block text-xs text-[#a8a29e]">{form.bio.length}/500</span>
          </label>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#e8e1d8] bg-[#fffdfb] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1c1917]">
          <Lock className="h-5 w-5 text-[#047857]" /> Change password
        </h2>
        <p className="mt-1 text-sm text-[#6b625b]">
          Use this if the site owner gave you a temporary password.
        </p>
        <form onSubmit={savePassword} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">Current password</span>
            <input
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">New password</span>
            <input
              type="password"
              value={pw.newPassword}
              onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
              required
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="mt-1 block text-xs text-[#a8a29e]">
              At least 8 characters, with an uppercase letter, a lowercase letter and a number.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[#1c1917]">Confirm new password</span>
            <input
              type="password"
              value={pw.confirm}
              onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
              required
              autoComplete="new-password"
              className="mt-1 w-full rounded-xl border border-[#d6ccbf] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          {pwError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {pwError}
            </p>
          )}
          <Button type="submit" disabled={savingPw}>
            {savingPw && <Loader2 className="h-4 w-4 animate-spin" />}
            {savingPw ? "Changing…" : "Change password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
