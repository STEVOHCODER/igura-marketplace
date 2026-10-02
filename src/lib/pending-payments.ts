import { prisma } from "@/lib/prisma";

/**
 * Pending-payment lifecycle guardrails.
 *
 * Quicko's contract: "Pending payments remain unpaid; failures need an
 * explicit retry decision", "do not ... blindly resubmit", and "a network
 * retry can charge or pay twice". So:
 *
 *  1. A click must never fire a fresh provider prompt while a live attempt
 *     is still unsettled — routes verify the existing PENDING payment first
 *     and reuse it instead of creating another.
 *  2. PENDING rows self-cancel after PENDING_TTL_MS. The prompt on the
 *     payer's handset expires on its own; our rows must not outlive it and
 *     block re-purchase forever. Expiry is lazy (applied on every
 *     payment-related read/write) so no cron is needed.
 */

export const PENDING_TTL_MS = 30 * 60 * 1000;

function staleBefore(): Date {
  return new Date(Date.now() - PENDING_TTL_MS);
}

/**
 * Cancels locally-stuck work: PENDING memberships older than the TTL (plus
 * their unsettled payments) and PENDING reveal payments older than the TTL.
 * Never touches SUCCESSFUL rows and never calls the provider — cancelling
 * here only frees our side; the provider prompt expires on its own, and a
 * late approval lands on a non-PENDING row which the settle paths refuse
 * to grant from.
 */
export async function sweepStalePending(): Promise<{ memberships: number; payments: number }> {
  const cutoff = staleBefore();

  const staleMemberships = await prisma.membership.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    select: { id: true },
  });

  let memberships = 0;
  let payments = 0;

  // A reactivated membership keeps its ORIGINAL createdAt (upsert never
  // touches it), so age alone cannot decide: a membership with a live
  // attempt is by definition not stuck, however old the row is. Only
  // memberships with no fresh PENDING payment are truly abandoned.
  const abandonedIds: string[] = [];
  for (const m of staleMemberships) {
    const live = await getLivePendingPayment(m.id);
    if (!live || !isPendingFresh(live.createdAt)) {
      abandonedIds.push(m.id);
    }
  }

  if (abandonedIds.length > 0) {
    const mRes = await prisma.membership.updateMany({
      where: { id: { in: abandonedIds }, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    memberships = mRes.count;

    const pRes = await prisma.payment.updateMany({
      where: { membershipId: { in: abandonedIds }, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    payments += pRes.count;
  }

  // Reveal payments carry no membership; find by their metadata marker.
  // (Json filtering is limited on Mongo, so scan the recent PENDING window.)
  const recentPending = await prisma.payment.findMany({
    where: { status: "PENDING", membershipId: null, createdAt: { lt: cutoff } },
    select: { id: true, metadata: true },
    take: 100,
  });
  const staleRevealIds = recentPending
    .filter((p) => (p.metadata as Record<string, unknown> | null)?.type === "phone_reveal")
    .map((p) => p.id);

  if (staleRevealIds.length > 0) {
    const rRes = await prisma.payment.updateMany({
      where: { id: { in: staleRevealIds }, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    payments += rRes.count;
  }

  return { memberships, payments };
}

/** Newest unsettled payment for a membership, if any. */
export async function getLivePendingPayment(membershipId: string) {
  return prisma.payment.findFirst({
    where: { membershipId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

/** True when the row is still inside its settle window. */
export function isPendingFresh(createdAt: Date): boolean {
  return createdAt.getTime() > Date.now() - PENDING_TTL_MS;
}
