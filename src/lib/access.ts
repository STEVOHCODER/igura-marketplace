import { prisma } from "@/lib/prisma";

/**
 * Server-side gates for paid features.
 *
 * Nothing in here may run on the client: these functions decide whether a
 * phone number is allowed to leave the server at all.
 */

export const REVEAL_FEE_RWF = 2000;

/** Days a commissionaire may list for free after registering. */
export const FREE_LISTING_DAYS = 30;

/** Active listings allowed during the free period. */
export const FREE_LISTING_QUOTA = 10;

/** Images allowed per listing during the free period. */
export const FREE_IMAGES_PER_LISTING = 3;

/**
 * True when this specific user has paid to see this specific property's phone.
 * Owners and admins always pass.
 */
export async function hasRevealedContact(
  userId: string | null | undefined,
  propertyId: string,
  ownerId?: string,
  role?: string
): Promise<boolean> {
  if (!userId) return false;
  if (ownerId && userId === ownerId) return true;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

  const reveal = await prisma.contactReveal.findFirst({
    where: { userId, propertyId },
    select: { id: true },
  });
  return !!reveal;
}

/**
 * Redacts the contact fields unless the viewer has paid.
 *
 * Detail pages previously passed `contactPhone` into a client component
 * unconditionally, so the number shipped inside the RSC payload and the
 * paywall could be bypassed by reading page source. Every route that returns a
 * property to a browser must funnel through this.
 */
export function redactContact<T extends { contactPhone?: string | null; contactName?: string | null }>(
  property: T,
  revealed: boolean
): T & { contactPhone: string | null; contactName: string | null; contactRevealed: boolean } {
  return {
    ...property,
    contactPhone: revealed ? property.contactPhone ?? null : null,
    contactName: revealed ? property.contactName ?? null : null,
    contactRevealed: revealed,
  };
}

/** Strips coordinates when the owner has not opted to publish them. */
export function redactCoordinates<T extends { latitude?: number | null; longitude?: number | null; coordinatesRevealed?: boolean }>(
  property: T
): T {
  if (property.coordinatesRevealed) return property;
  return { ...property, latitude: null, longitude: null };
}

export interface ListingAllowance {
  allowed: boolean;
  reason?: string;
  maxActiveListings: number;
  maxImagesPerListing: number;
  isFreePeriod: boolean;
  freePeriodEndsAt?: Date;
  activeListings: number;
}

/**
 * Resolves how many listings/images a user may have right now.
 *
 * Membership expiry is enforced here: a membership with a past `expiresAt` no
 * longer counts as active, regardless of its stored status.
 */
export async function getListingAllowance(userId: string): Promise<ListingAllowance> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });

  const activeListings = await prisma.property.count({
    where: { ownerId: userId, status: { in: ["ACTIVE", "DRAFT", "UPCOMING"] } },
  });

  if (!user) {
    return {
      allowed: false,
      reason: "User not found",
      maxActiveListings: 0,
      maxImagesPerListing: 0,
      isFreePeriod: false,
      activeListings,
    };
  }

  const membership = await getActiveMembership(userId);

  if (membership) {
    return {
      allowed: activeListings < membership.plan.maxActiveListings,
      reason:
        activeListings >= membership.plan.maxActiveListings
          ? `Listing limit reached. Your plan allows ${membership.plan.maxActiveListings} active listings.`
          : undefined,
      maxActiveListings: membership.plan.maxActiveListings,
      maxImagesPerListing: membership.plan.maxImagesPerListing,
      isFreePeriod: false,
      activeListings,
    };
  }

  const freePeriodEndsAt = new Date(user.createdAt);
  freePeriodEndsAt.setDate(freePeriodEndsAt.getDate() + FREE_LISTING_DAYS);
  const isFreePeriod = freePeriodEndsAt > new Date();

  if (!isFreePeriod) {
    return {
      allowed: false,
      reason: "Your free listing period has ended. Please purchase a membership to continue listing.",
      maxActiveListings: 0,
      maxImagesPerListing: 0,
      isFreePeriod: false,
      freePeriodEndsAt,
      activeListings,
    };
  }

  return {
    allowed: activeListings < FREE_LISTING_QUOTA,
    reason:
      activeListings >= FREE_LISTING_QUOTA
        ? `Free listing limit reached (${FREE_LISTING_QUOTA}). Upgrade to a membership for more listings.`
        : undefined,
    maxActiveListings: FREE_LISTING_QUOTA,
    maxImagesPerListing: FREE_IMAGES_PER_LISTING,
    isFreePeriod: true,
    freePeriodEndsAt,
    activeListings,
  };
}

/**
 * Returns the user's active COMMISSIONAIRE membership, treating an elapsed
 * `expiresAt` as expired and lazily flipping the stored status so admin views
 * and reports stay truthful.
 */
export async function getActiveMembership(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", plan: { role: "COMMISSIONAIRE" } },
    include: { plan: true },
    orderBy: { activatedAt: "desc" },
  });

  if (!membership) return null;

  if (membership.expiresAt && membership.expiresAt < new Date()) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  return membership;
}
