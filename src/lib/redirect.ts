/**
 * Post-login redirect target validation.
 *
 * `?redirect=` is written by middleware when a protected route was the real
 * destination, but a hand-crafted URL can put anything there. Without a check,
 * `?redirect=//evil.example` pushes the browser to another origin while the
 * user still sees a successful Igura login - a phishing-grade open redirect.
 *
 * Only same-origin absolute paths qualify: a single leading slash, and not the
 * two-slash form browsers read as protocol-relative.
 */
export function safeInternalPath(raw: string | null | undefined): string | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.startsWith("/\\")) return null;
  return raw;
}

/**
 * Where a freshly signed-in user belongs when they had no explicit
 * destination. Admins land on /admin; everyone else on /dashboard. The old
 * behaviour sent every role to /dashboard, so an admin signing in at plain
 * /login never reached the admin panel.
 */
export function defaultHomeForRole(role: string | null | undefined): string {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : "/dashboard";
}
