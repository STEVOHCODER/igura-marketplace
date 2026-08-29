import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment-provider";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { reference } = await params;

    const payment = await prisma.payment.findFirst({
      where: { reference },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.userId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (payment.status === "PENDING") {
      const provider = getPaymentProvider();
      const result = await provider.verifyPayment(reference);

      if (result.status !== payment.status) {
        const statusMap: Record<string, string> = {
          SUCCESSFUL: "SUCCESSFUL",
          FAILED: "FAILED",
          CANCELLED: "CANCELLED",
          PENDING: "PENDING",
        };

        const newStatus = statusMap[result.status] || "PENDING";

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: newStatus as any,
            providerTransactionId: result.transactionId || payment.providerTransactionId,
            paidAt: newStatus === "SUCCESSFUL" ? new Date() : payment.paidAt,
          },
        });

        await prisma.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: "verification",
            payload: result as any,
          },
        });

        if (newStatus === "SUCCESSFUL" && payment.membershipId) {
          await prisma.membership.update({
            where: { id: payment.membershipId },
            data: {
              status: "ACTIVE",
              activatedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          payment: {
            id: payment.id,
            status: newStatus,
            reference: payment.reference,
            amount: payment.amount,
            currency: payment.currency,
          },
        });
      }
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        status: payment.status,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
      },
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
