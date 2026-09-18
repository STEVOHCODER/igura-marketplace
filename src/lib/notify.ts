import { prisma } from "@/lib/prisma";

/**
 * Notification creation helpers.
 *
 * The Notification model already existed but was only ever written by two
 * admin routes and never read — there was no API and no UI. These helpers give
 * the rest of the app one place to raise a notification, and `/api/notifications`
 * plus the navbar bell give users somewhere to see it.
 */

export type NotificationType =
  | "LISTING_APPROVED"
  | "LISTING_REJECTED"
  | "LISTING_PUBLISHED"
  | "LISTING_EXPIRING"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "CONTACT_REVEALED"
  | "CONTACT_PURCHASED"
  | "MEMBERSHIP_ACTIVATED"
  | "MEMBERSHIP_EXPIRING"
  | "MEMBERSHIP_EXPIRED"
  | "REPORT_RECEIVED"
  | "REPORT_RESOLVED"
  | "FREE_PERIOD_ENDING"
  | "WELCOME";

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: (params.metadata as any) ?? undefined,
      },
    });
  } catch (error) {
    // A notification must never fail the action that triggered it.
    console.error("notify() failed:", error);
    return null;
  }
}

export async function notifyMany(
  userIds: string[],
  payload: Omit<Parameters<typeof notify>[0], "userId">
) {
  await Promise.all(userIds.map((userId) => notify({ userId, ...payload })));
}

/** Notifies every admin — used for reports and other moderation triggers. */
export async function notifyAdmins(
  payload: Omit<Parameters<typeof notify>[0], "userId">
) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    payload
  );
}
