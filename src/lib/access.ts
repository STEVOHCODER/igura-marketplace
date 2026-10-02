import { prisma } from "@/lib/prisma";

/**
 * Server-side gates for paid features.
 *
 * Nothing in here may run on the client: these functions decide whether a
 * phone number is allowed to leave the server at all.
 */

export const REVEAL_FEE_RWF = 2000;

/** Free launch allowance for every authenticated commissionaire. */
export const FREE_LISTING_QUOTA = 5;

/** Images allowed per listing during the free launch. */
export const FREE_IMAGES_PER_LISTING = 3;

/** One total walkthrough video across the free five listings. */
export const FREE_TOTAL_VIDEOS = 1;

/** Maximum duration of the free walkthrough video. */
export const FREE_VIDEO_LENGTH_SECONDS = 20;

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
  maxVideoLengthSeconds: number;
  maxTotalVideos: number;
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
    select: { role: true },
  });

  // Only LIVE listings occupy a slot. Drafts (and upcoming) are preparation,
  // not publication — counting them punished users for writing a listing
  // before publishing it, while the message promises "active listings".
  const activeListings = await prisma.property.count({
    where: { ownerId: userId, status: "ACTIVE" },
  });

  if (!user) {
    return {
      allowed: false,
      reason: "User not found",
      maxActiveListings: 0,
      maxImagesPerListing: 0,
      maxVideoLengthSeconds: 0,
      maxTotalVideos: 0,
      isFreePeriod: false,
      activeListings,
    };
  }

  if (user.role !== "COMMISSIONAIRE") {
    return {
      allowed: false,
      reason: "Only commissionaires can publish listings.",
      maxActiveListings: 0,
      maxImagesPerListing: 0,
      maxVideoLengthSeconds: 0,
      maxTotalVideos: 0,
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
      maxVideoLengthSeconds: membership.plan.maxVideoLengthSeconds,
      maxTotalVideos: membership.plan.maxTotalVideos,
      isFreePeriod: false,
      activeListings,
    };
  }

  return {
    allowed: activeListings < FREE_LISTING_QUOTA,
    reason:
      activeListings >= FREE_LISTING_QUOTA
        ? `Free launch limit reached (${FREE_LISTING_QUOTA}). Paid plans will be available later.`
        : undefined,
    maxActiveListings: FREE_LISTING_QUOTA,
    maxImagesPerListing: FREE_IMAGES_PER_LISTING,
    maxVideoLengthSeconds: FREE_VIDEO_LENGTH_SECONDS,
    maxTotalVideos: FREE_TOTAL_VIDEOS,
    isFreePeriod: true,
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

/**
 * Whether the user may START a listing (which always begins as DRAFT).
 * Drafts are free and unbounded — the slot is only taken at publish time
 * (see the PUT guard), so this ignores the active count and only asks:
 * member in good standing, or the free launch allowance?
 */
export async function canCreateListing(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const membership = await getActiveMembership(userId);
  if (membership) return { allowed: true };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return { allowed: false, reason: "User not found" };
  if (user.role !== "COMMISSIONAIRE") {
    return { allowed: false, reason: "Only commissionaires can publish listings." };
  }

  return { allowed: true };
}

/**
 * Checks whether a user can upload a video of the given duration.
 *
 * During the free launch, one 20-second video is enabled across the user's
 * first five free listings. Paid memberships can later override this limit.
 *
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string, maxDuration: number }`.
 */
export async function checkVideoAccess(
  userId: string,
  durationSeconds: number
): Promise<{ allowed: boolean; reason?: string; maxDuration: number; maxTotalVideos: number; currentVideoCount: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) {
    return { allowed: false, reason: "User not found", maxDuration: 0, maxTotalVideos: 0, currentVideoCount: 0 };
  }
  if (user.role !== "COMMISSIONAIRE") {
    return { allowed: false, reason: "Only commissionaires can upload listing videos.", maxDuration: 0, maxTotalVideos: 0, currentVideoCount: 0 };
  }

  // Count total videos across all user's listings (new model + legacy)
  const newVideoCount = await prisma.propertyVideo.count({
    where: { property: { ownerId: userId } },
  });
  const legacyPropertiesWithVideo = await prisma.property.count({
    where: { ownerId: userId, videoUrl: { not: null } },
  });
  const currentVideoCount = newVideoCount + legacyPropertiesWithVideo;

  // Check membership first
  const membership = await getActiveMembership(userId);
  if (membership) {
    const maxDur = membership.plan.maxVideoLengthSeconds;
    const maxVids = membership.plan.maxTotalVideos;
    if (maxDur <= 0) {
      return { allowed: false, reason: "Your plan does not include video uploads. Upgrade to Professional or Enterprise.", maxDuration: 0, maxTotalVideos: 0, currentVideoCount };
    }
    if (currentVideoCount >= maxVids) {
      return { allowed: false, reason: `You've used all ${maxVids} video slots on your plan. Upgrade for more.`, maxDuration: maxDur, maxTotalVideos: maxVids, currentVideoCount };
    }
    if (durationSeconds > maxDur) {
      return { allowed: false, reason: `Video must be ${maxDur} seconds or shorter on your plan. Upgrade for longer videos.`, maxDuration: maxDur, maxTotalVideos: maxVids, currentVideoCount };
    }
    return { allowed: true, maxDuration: maxDur, maxTotalVideos: maxVids, currentVideoCount };
  }

  if (currentVideoCount >= FREE_TOTAL_VIDEOS) {
    return { allowed: false, reason: "You've used the one free video slot.", maxDuration: FREE_VIDEO_LENGTH_SECONDS, maxTotalVideos: FREE_TOTAL_VIDEOS, currentVideoCount };
  }

  if (durationSeconds > FREE_VIDEO_LENGTH_SECONDS) {
    return { allowed: false, reason: `Video must be ${FREE_VIDEO_LENGTH_SECONDS} seconds or shorter.`, maxDuration: FREE_VIDEO_LENGTH_SECONDS, maxTotalVideos: FREE_TOTAL_VIDEOS, currentVideoCount };
  }

  return { allowed: true, maxDuration: FREE_VIDEO_LENGTH_SECONDS, maxTotalVideos: FREE_TOTAL_VIDEOS, currentVideoCount };
}
