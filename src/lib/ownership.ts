import { JWTPayload } from "./auth";

/**
 * Ownership and privilege checks.
 *
 * Every property route needs the same question answered - "may this session
 * touch this listing?" - and it was previously open-coded inline in five
 * places as `property.ownerId !== session.userId`, with a one-off admin
 * exemption bolted onto the delete path only. That drift is how the upload
 * routes ended up rejecting admins who were supposed to be able to help a
 * lister. Centralising it here means one rule, one place to change.
 */

export function isAdmin(session: JWTPayload | null | undefined): boolean {
  return !!session && (session.role === "ADMIN" || session.role === "SUPER_ADMIN");
}

/**
 * True when the session owns the resource, or is an administrator acting on
 * the owner's behalf.
 *
 * The admin branch is what lets you enter a commissionaire's listings: the
 * listing is created with `ownerId` pointing at them, and the follow-up image
 * and video uploads are authorised by this check rather than by session
 * identity.
 */
export function isOwnerOrAdmin(
  session: JWTPayload | null | undefined,
  ownerId: string | null | undefined
): boolean {
  if (!session || !ownerId) return false;
  return session.userId === ownerId || isAdmin(session);
}

/**
 * Roles that may own property listings. Anything else cannot be the ownerId of
 * a listing created on someone's behalf.
 */
export const OWNER_CAPABLE_ROLES = new Set(["USER", "CLIENT", "COMMISSIONAIRE"]);

export function canOwnListings(role: string | null | undefined): boolean {
  return !!role && OWNER_CAPABLE_ROLES.has(role);
}
