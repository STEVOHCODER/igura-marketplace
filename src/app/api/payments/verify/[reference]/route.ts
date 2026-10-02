import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payment-provider";
import { buildMembershipGrant, isSafePaymentReference } from "@/lib/payments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { reference } = await params;

    if (!isSafePaymentReference(reference)) {
      return NextResponse.json({ error: "Invalid payment reference" }, { status: 400 });
    }

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
      // MTN looks transactions up by the X-Reference-Id UUID from initiation
      // (stored in providerTransactionId), not by our own reference.
      const result = await provider.verifyPayment(reference, payment.providerTransactionId || undefined);

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
          // Confirm the settled amount and currency before granting, and stamp
          // the 30-day expiry. This route previously wrote neither, so a buyer
          // who confirmed here before the webhook landed kept a lifetime
          // membership — see src/lib/payments.ts.
          const grant = buildMembershipGrant({
            paymentAmount: payment.amount,
            paymentCurrency: payment.currency,
            settledAmount: result.amount,
            settledCurrency: result.currency,
          });

          if (grant) {
            await prisma.membership.update({
              where: { id: payment.membershipId },
              data: grant,
            });
          } else {
            console.warn(
              `[payments] Verify route rejecting ${reference}: expected ${payment.amount} ${payment.currency}, got ${result.amount} ${result.currency}`
            );
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "FAILED" },
            });
            return NextResponse.json(
              { error: "Payment amount could not be confirmed", payment: { id: payment.id, status: "FAILED", reference: payment.reference } },
              { status: 402 }
            );
          }
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
