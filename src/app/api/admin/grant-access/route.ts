import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Admin: manually activate a membership for a user (bypass payment)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, planId, action } = body;

    if (!userId || !planId) {
      return NextResponse.json({ error: "userId and planId required" }, { status: 400 });
    }

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
