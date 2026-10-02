import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

const grantSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  action: z.enum(["activate", "revoke"]),
  /** Optional end date; defaults to 30 days from now so a grant is not eternal. */
  expiresAt: z.string().datetime().or(z.string().date()).optional(),
});

// Admin: manually activate a membership for a user (bypass payment)
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const limited = enforceRateLimit(
      request,
      "admin-grant",
      LIMITS.admin.limit,
      LIMITS.admin.windowMs,
      session.userId
    );
    if (limited) return limited;

    const parsed = grantSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { userId, planId, action, expiresAt: expiresAtRaw } = parsed.data;

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find or create membership
    let membership = await prisma.membership.findFirst({
      where: { userId, planId },
      include: { plan: true },
    });

    if (action === "activate") {
      // An admin grant used to create a membership with no expiry at all, which
      // silently made it permanent. Default to the plan's period and let an
      // explicit `expiresAt` override it.
      const now = new Date();
      const expiresAt =
        expiresAtRaw != null
          ? new Date(expiresAtRaw)
          : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (membership) {
        membership = await prisma.membership.update({
          where: { id: membership.id },
          data: { status: "ACTIVE", activatedAt: now, expiresAt },
          include: { plan: true },
        });
      } else {
        membership = await prisma.membership.create({
          data: { userId, planId, status: "ACTIVE", activatedAt: now, expiresAt },
          include: { plan: true },
        });
      }

      // Also create a successful payment record
      await prisma.payment.create({
        data: {
          userId,
          membershipId: membership.id,
          planId,
          amount: membership.plan?.price || 0,
          currency: "RWF",
          provider: "admin_grant",
          reference: `ADMIN-GRANT-${Date.now()}`,
          status: "SUCCESSFUL",
          method: "ADMIN",
        },
      });

      // This route mints money-shaped records, so it belongs in the audit log
      // like every other privileged mutation. Without this, /admin/audit
      // claimed to track all admin actions while missing every grant.
      await prisma.adminAction.create({
        data: {
          adminId: session.userId,
          actionType: "MEMBERSHIP_GRANTED",
          targetType: "MEMBERSHIP",
          targetId: membership.id,
          details: {
            targetEmail: target.email,
            planName: membership.plan?.name || null,
            amount: membership.plan?.price || 0,
            expiresAt: expiresAt.toISOString(),
            byAdmin: true,
          },
        },
      });

      return NextResponse.json({ success: true, membership });
    }

    if (action === "revoke") {
      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: "CANCELLED" },
        });

        await prisma.adminAction.create({
          data: {
            adminId: session.userId,
            actionType: "MEMBERSHIP_REVOKED",
            targetType: "MEMBERSHIP",
            targetId: membership.id,
            details: { targetEmail: target.email, planId, byAdmin: true },
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action. Use 'activate' or 'revoke'" }, { status: 400 });
  } catch (error) {
    console.error("Admin grant access error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
