import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

const grantSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
  action: z.enum(["activate", "revoke"]),
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
    const { userId, planId, action } = parsed.data;

    // Find or create membership
    let membership = await prisma.membership.findFirst({
      where: { userId, planId },
      include: { plan: true },
    });

    if (action === "activate") {
      if (membership) {
        membership = await prisma.membership.update({
          where: { id: membership.id },
          data: { status: "ACTIVE", activatedAt: new Date() },
          include: { plan: true },
        });
      } else {
        membership = await prisma.membership.create({
          data: { userId, planId, status: "ACTIVE", activatedAt: new Date() },
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

      return NextResponse.json({ success: true, membership });
    }

    if (action === "revoke") {
      if (membership) {
        await prisma.membership.update({
          where: { id: membership.id },
          data: { status: "CANCELLED" },
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
