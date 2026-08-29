import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment-provider";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { planId } = body;

    if (!planId || typeof planId !== "string") {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { marketplace: true },
    });

    if (!plan || plan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
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
      });

      if (existingPayment) {
        const provider = getPaymentProvider();
        const result = await provider.initiatePayment({
          amount: plan.price,
          currency: plan.currency,
          reference: existingPayment.reference || `IGURA-${existingPayment.id}`,
          email: session.email,
          method: "mobile_money",
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        });

        if (result.success && result.checkoutUrl) {
          return NextResponse.json({
            paymentUrl: result.checkoutUrl,
            paymentId: existingPayment.id,
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
        provider: "flutterwave",
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
      phone: user?.phone || undefined,
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
