import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { getPaymentProvider, getProviderName } from "@/lib/payment-provider";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { isPendingFresh, sweepStalePending } from "@/lib/pending-payments";
import { isPaymentsEnabled } from "@/lib/monetization";

export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Lazy expiry: stuck prompts free themselves on read, so the dashboard
    // never shows a PENDING that can no longer settle.
    await sweepStalePending();

    const memberships = await prisma.membership.findMany({
      where: { userId: session.userId },
      include: {
        plan: {
          include: {
            marketplace: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error("Get memberships error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "payment", LIMITS.payment.limit, LIMITS.payment.windowMs);
    if (limited) return limited;

    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isPaymentsEnabled()) {
      return NextResponse.json(
        { error: "Paid plans are paused during the free launch." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { planId, phone } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    const payerPhone = typeof phone === "string" && phone.trim() ? phone.trim() : undefined;

    // Expire locally-stuck rows first so a dead prompt can never block
    // re-purchase, and a malformed id answers 404 instead of throwing.
    await sweepStalePending();

    if (!/^[0-9a-fA-F]{24}$/.test(planId)) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { marketplace: true },
    });

    if (!plan || plan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
    }

    if (plan.role !== "COMMISSIONAIRE") {
      return NextResponse.json(
        { error: "Client browsing is free; this plan is not purchasable." },
        { status: 400 }
      );
    }

    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        planId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
    });

    if (existingMembership) {
      if (existingMembership.status === "ACTIVE") {
        return NextResponse.json(
          { error: "You already have an active membership for this plan" },
          { status: 409 }
        );
      }

      const existingPayment = await prisma.payment.findFirst({
        where: {
          membershipId: existingMembership.id,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingPayment) {
        // A click must never fire a fresh provider prompt while an attempt
        // is still unsettled (Quicko: "do not blindly resubmit", "a network
        // retry can charge or pay twice"). Check the live attempt first.
        if (isPendingFresh(existingPayment.createdAt)) {
          const provider = getPaymentProvider();
          const check = await provider.verifyPayment(
            existingPayment.reference || `IGURA-${existingPayment.id}`,
            existingPayment.providerTransactionId || undefined
          );

          if (check.status === "FAILED" || check.status === "CANCELLED") {
            // Explicit retry decision: the old attempt is dead, so fall
            // through and create a new one below.
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: { status: check.status as any },
            });
          } else {
            // Still live (or lookup uncertain) — hand back the existing
            // attempt instead of prompting the handset a second time. If it
            // has since succeeded, the next status check settles it.
            if (check.transactionId && check.transactionId !== existingPayment.providerTransactionId) {
              await prisma.payment.update({
                where: { id: existingPayment.id },
                data: { providerTransactionId: check.transactionId },
              });
            }
            return NextResponse.json({
              success: true,
              pending: true,
              reference: existingPayment.reference,
              paymentId: existingPayment.id,
              message:
                "A payment request is already active on your number. Approve it on your phone, then check its status.",
            });
          }
        } else {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: "CANCELLED" },
          });
        }
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    const membership = await prisma.membership.upsert({
      where: {
        userId_planId: {
          userId: session.userId,
          planId,
        },
      },
      update: { status: "PENDING" },
      create: {
        userId: session.userId,
        planId,
        status: "PENDING",
      },
    });

    const reference = `IGURA-${membership.id.slice(-8).toUpperCase()}-${Date.now()}`;

    const payment = await prisma.payment.create({
      data: {
        userId: session.userId,
        membershipId: membership.id,
        planId,
        amount: plan.price,
        currency: plan.currency,
        provider: getProviderName(),
        reference,
        status: "PENDING",
        method: "MOBILE_MONEY",
      },
    });

    const provider = getPaymentProvider();
    const result = await provider.initiatePayment({
      amount: plan.price,
      currency: plan.currency,
      reference,
      email: session.email,
      phone: payerPhone || user?.phone || undefined,
      name: user ? `${user.firstName} ${user.lastName}` : undefined,
      method: "mobile_money",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    });

    if (result.success && result.checkoutUrl) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: result.transactionId || null },
      });

      return NextResponse.json({
        paymentUrl: result.checkoutUrl,
        paymentId: payment.id,
      });
    }

    // Quicko Request to Pay: no redirect — the payer approves on their handset.
    // Same keep-open rule as the retry path above.
    if (result.status === "PENDING") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { providerTransactionId: result.transactionId || null },
      });

      return NextResponse.json({
        success: true,
        pending: true,
        reference,
        paymentId: payment.id,
        message: result.message,
      });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });

    return NextResponse.json(
      { error: result.message || "Failed to initiate payment" },
      { status: 502 }
    );
  } catch (error) {
    console.error("Create membership error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Cancels a stuck PENDING membership (and its unsettled payments).
 *
 * A membership goes PENDING when its payment is initiated and stays there
 * until the payer approves on their handset. If the prompt expired or the
 * buyer walked away, the row blocks re-purchase in the UI with no way out —
 * there was no cancel path at all. ACTIVE memberships are never cancelled
 * here; SUCCESSFUL payments are never touched.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get("membershipId") || "";

    // Same guard as the property routes: Prisma's MongoDB driver throws on
    // a malformed ObjectId instead of returning null.
    if (!/^[0-9a-fA-F]{24}$/.test(membershipId)) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });

    if (!membership) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    const isOwner = membership.userId === session.userId;
    const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (membership.status === "ACTIVE") {
      return NextResponse.json(
        { error: "Active memberships cannot be cancelled here. Please contact support." },
        { status: 409 }
      );
    }

    if (membership.status !== "PENDING") {
      return NextResponse.json({ success: true, already: membership.status });
    }

    await prisma.membership.update({
      where: { id: membership.id },
      data: { status: "CANCELLED" },
    });

    // Only unsettled payments move. A SUCCESSFUL row keeps its grant; a
    // later approval of an expired prompt lands on a CANCELLED membership
    // and the verify route (PENDING-only) will not grant from it.
    await prisma.payment.updateMany({
      where: { membershipId: membership.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true, status: "CANCELLED" });
  } catch (error) {
    console.error("Cancel membership error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
