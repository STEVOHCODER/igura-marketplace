import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment-provider";
import { buildMembershipGrant } from "@/lib/payments";
import { grantReveal } from "@/lib/reveals";

function matchesSecret(received: string, expected: string): boolean {
  const actual = Buffer.from(received);
  const configured = Buffer.from(expected);
  return actual.length === configured.length && timingSafeEqual(actual, configured);
}

export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim();
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";

  if (!configured || !received || !matchesSecret(received, configured)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await prisma.payment.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    const provider = getPaymentProvider();
    let successful = 0;
    let stillPending = 0;
    let failed = 0;
    let errors = 0;

    for (const payment of pending) {
      if (!payment.reference) {
        failed += 1;
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        continue;
      }

      try {
        const result = await provider.verifyPayment(
          payment.reference,
          payment.providerTransactionId || undefined
        );

        if (result.status === "PENDING") {
          stillPending += 1;
          continue;
        }

        if (result.status !== "SUCCESSFUL") {
          failed += 1;
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: result.status },
          });
          continue;
        }

        const metadata = (payment.metadata as Record<string, unknown> | null) ?? {};
        const isReveal = metadata.type === "phone_reveal" && typeof metadata.propertyId === "string";

        if (isReveal) {
          if (result.amount !== payment.amount || result.currency !== payment.currency) {
            failed += 1;
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
            continue;
          }
        } else if (payment.membershipId) {
          const grant = buildMembershipGrant({
            paymentAmount: payment.amount,
            paymentCurrency: payment.currency,
            settledAmount: result.amount,
            settledCurrency: result.currency,
          });
          if (!grant) {
            failed += 1;
            await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
            continue;
          }
          await prisma.membership.update({ where: { id: payment.membershipId }, data: grant });
        }

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESSFUL",
            paidAt: new Date(),
            providerTransactionId: result.transactionId || payment.providerTransactionId,
          },
        });

        await prisma.paymentEvent.create({
          data: { paymentId: payment.id, eventType: "reconciliation", payload: result as object },
        });

        if (isReveal) {
          await grantReveal({
            userId: payment.userId,
            propertyId: metadata.propertyId as string,
            paymentId: payment.id,
            transactionId: result.transactionId,
          });
        }
        successful += 1;
      } catch (error) {
        errors += 1;
        console.error(`[payments] reconciliation failed for ${payment.id}:`, error);
      }
    }

    return NextResponse.json({ processed: pending.length, successful, stillPending, failed, errors });
  } catch (error) {
    console.error("Payment reconciliation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
