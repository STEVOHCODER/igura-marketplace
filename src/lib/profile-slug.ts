import { prisma } from "./prisma";

/**
 * Public profile URL slugs.
 *
 * A slug is the durable, shareable link an agent prints on a flyer and posts
 * on WhatsApp or Facebook. That makes two properties non-negotiable:
 *
 *  1. It must be unique across all users. Two agents called "Jean Bosco" must
 *     never end up on the same URL, or one agent's link silently shows the
 *     other's listings.
 *  2. It must never change once assigned. If a rename regenerated the slug,
 *     every link already shared would 404 and the agent would lose leads they
 *     paid to acquire. So slugs are written once and only backfilled when
 *     missing - see assignProfileSlug.
 */

/**
 * Top-level paths that would shadow a real page if a slug matched them.
 * Compared against the first path segment only, since that is what the router
 * resolves.
 */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "about", "auth", "compare", "contact", "dashboard", "help",
  "how-it-works", "locations", "login", "logout", "owners", "payment", "plots",
  "privacy", "register", "rent", "saved", "saved-searches", "sell", "terms",
  "agent", "settings", "notifications", "leads", "memberships", "signup",
  "signin", "signout", "new", "edit", "null", "undefined",
]);

/** Keeps URLs readable; the longest Rwandan name plus a suffix still fits. */
const MAX_SLUG_LENGTH = 60;

/** Below this, "-2"/"-3" suffixes would eat the whole budget. */
const MIN_BASE_LENGTH = 3;

/**
 * Normalise a display name into a URL slug.
 *
 * Diacritics are folded rather than dropped, so "Niyonzimana" and
 * "NIYONZIMANA" collapse to the same base and the uniqueness pass resolves
 * them instead of minting two near-identical URLs.
 */
export function slugifyName(firstName: string, lastName: string): string {
  const combined = `${firstName ?? ""} ${lastName ?? ""}`.trim();

  const slug = combined
    .normalize("NFKD")
    // Strip the combining marks left behind by NFKD.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (!slug) {
    // Non-Latin names can normalise to nothing at all. A readable fallback
    // beats an empty slug, which would produce the bare "/agent/" route.
    return `agent-${Date.now().toString(36)}`;
  }

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}

/**
 * Produce a slug that is not already taken.
 *
 * Checks the database rather than trusting the caller, because uniqueness is
 * the whole point: a pure function would happily hand the same slug to two
 * users created in the same request. Falls back to a short random suffix if the
 * numeric sequence is somehow exhausted.
 */
export async function generateUniqueSlug(
  firstName: string,
  lastName: string,
  options: { excludeUserId?: string } = {}
): Promise<string> {
  const base = slugifyName(firstName, lastName);

  if (base.length < MIN_BASE_LENGTH) {
    return withRandomSuffix(base);
  }

  if (RESERVED_SLUGS.has(base)) {
    // Reserved words are suffixed rather than rejected: refusing to create the
    // account would be worse than a slightly longer URL, and the agent can
    // still share it.
    return firstFreeSlug(`${base}-agent`, options);
  }

  return firstFreeSlug(base, options);
}

async function firstFreeSlug(
  base: string,
  options: { excludeUserId?: string }
): Promise<string> {
  const taken = await prisma.profile.findMany({
    where: { slug: { startsWith: base }, ...(options.excludeUserId ? { userId: { not: options.excludeUserId } } : {}) },
    select: { slug: true },
  });

  const used = new Set(taken.map((p) => p.slug as string));
  if (!used.has(base)) return base;

  // Sequential suffix keeps URLs guessable and tidy: jean-bosco, jean-bosco-2,
  // jean-bosco-3. Bounded so a pathological dataset cannot spin here.
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }

  return withRandomSuffix(base);
}

function withRandomSuffix(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Give a user their permanent slug, creating the Profile row if needed.
 *
 * Idempotent by design: if the profile already has a slug it is returned
 * untouched. That is what stops a rename from breaking a shared link, and it
 * makes the function safe to call from a backfill loop.
 */
export async function assignProfileSlug(
  userId: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const existing = await prisma.profile.findUnique({
    where: { userId },
    select: { slug: true },
  });

  if (existing?.slug) return existing.slug;

  const slug = await generateUniqueSlug(firstName, lastName, { excludeUserId: userId });

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, slug },
    update: { slug },
  });

  return slug;
}

/**
 * Resolve a public slug back to a user id. Case-insensitive because agents
 * type these by hand and WhatsApp autocorrect capitalises.
 */
export async function findUserIdBySlug(slug: string): Promise<string | null> {
  const profile = await prisma.profile.findFirst({
    where: { slug: slug.toLowerCase() },
    select: { userId: true },
  });
  return profile?.userId ?? null;
}
