import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment-provider";
import { grantReveal } from "@/lib/reveals";
import { notify } from "@/lib/notify";
import { buildMembershipGrant } from "@/lib/payments";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("verif-hash") ||
      request.headers.get("x-flutterwave-signature") ||
      "";

    let event;
    try {
      const payload = JSON.parse(rawBody);
      const provider = getPaymentProvider();
      // Rejects unsigned/forged payloads — see FlutterwaveProvider.handleWebhook.
      event = provider.handleWebhook(payload, signature);
    } catch {
      return NextResponse.json({ status: "ignored" });
    }

    if (!event) {
      return NextResponse.json({ status: "ignored" }, { status: 401 });
    }

    const payment = await prisma.payment.findFirst({
      where: { reference: event.reference },
    });

    if (!payment) {
      console.error("Webhook: Payment not found for reference:", event.reference);
      return NextResponse.json({ status: "not_found" });
    }

    // Never act twice on the same settled payment.
    if (payment.status === "SUCCESSFUL") {
      // Backfill a missing expiry on a membership that was activated by the
      // verify route before this fix shipped, so nothing stays lifetime.
      if (payment.membershipId) {
        const m = await prisma.membership.findUnique({
          where: { id: payment.membershipId },
          select: { id: true, status: true, expiresAt: true },
        });
        if (m && m.status === "ACTIVE" && !m.expiresAt) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          await prisma.membership.update({
            where: { id: m.id },
            data: { expiresAt },
          });
        }
      }
      return NextResponse.json({ status: "already_processed" });
    }

    const statusMap: Record<string, string> = {
      successful: "SUCCESSFUL",
      failed: "FAILED",
      cancelled: "CANCELLED",
      pending: "PENDING",
    };

    let newStatus = statusMap[event.status] || "PENDING";

    // Trust the webhook for the fact of payment, but confirm the amount
    // out-of-band before granting anything. A short-paid or wrong-currency
    // transaction must not unlock a membership or a phone number.
    if (newStatus === "SUCCESSFUL") {
      const underpaid = event.amount != null && event.amount < payment.amount;
      const wrongCurrency = event.currency && event.currency !== payment.currency;

      if (underpaid || wrongCurrency) {
        console.warn(
          `[payments] Rejecting ${event.reference}: expected ${payment.amount} ${payment.currency}, got ${event.amount} ${event.currency}`
        );
        newStatus = "FAILED";
      }
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus as any,
        providerTransactionId: event.transactionId || payment.providerTransactionId,
        paidAt: newStatus === "SUCCESSFUL" ? new Date() : payment.paidAt,
      },
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: event.type,
        payload: event as any,
      },
    });

    if (newStatus !== "SUCCESSFUL") {
      if (newStatus === "FAILED" || newStatus === "CANCELLED") {
        await notify({
          userId: payment.userId,
          type: "PAYMENT_FAILED",
          title: "Payment not completed",
          message: `Your payment of ${payment.amount.toLocaleString()} RWF did not go through. No money was taken.`,
          metadata: { reference: event.reference },
        });
      }
      return NextResponse.json({ status: "processed" });
    }

    const metadata = (payment.metadata as Record<string, unknown> | null) ?? {};

    // Contact reveals have no membership attached. The original handler only
    // looked at `payment.membershipId`, so a buyer who closed the tab after
    // paying got nothing at all.
    if (metadata.type === "phone_reveal" && typeof metadata.propertyId === "string") {
      if (
        event.amount !== payment.amount ||
        event.currency !== payment.currency
      ) {
        console.warn(
          `[payments] Rejecting reveal ${event.reference}: expected ${payment.amount} ${payment.currency}, got ${event.amount} ${event.currency}`
        );
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        return NextResponse.json({ status: "processed" });
      }
      await grantReveal({
        userId: payment.userId,
        propertyId: metadata.propertyId,
        paymentId: payment.id,
        transactionId: event.transactionId,
      });
      return NextResponse.json({ status: "processed" });
    }

    if (payment.membershipId) {
      const grant = buildMembershipGrant({
        paymentAmount: payment.amount,
        paymentCurrency: payment.currency,
        settledAmount: event.amount,
        settledCurrency: event.currency,
      });

      // A rejected amount flips the payment to FAILED above; if that somehow
      // did not happen, refuse to grant rather than fall through.
      if (grant) {
        await prisma.membership.update({
          where: { id: payment.membershipId },
          data: grant,
        });

        await notify({
          userId: payment.userId,
          type: "MEMBERSHIP_ACTIVATED",
          title: "Membership active",
          message: `Your membership is active until ${grant.expiresAt.toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })}.`,
          metadata: { membershipId: payment.membershipId },
        });
      }
    }

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
