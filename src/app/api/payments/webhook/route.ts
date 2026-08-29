import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment-provider";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("verif-hash") || request.headers.get("x-flutterwave-signature") || "";

    let event;
    try {
      const payload = JSON.parse(rawBody);
      const provider = getPaymentProvider();
      event = provider.handleWebhook(payload, signature);
    } catch {
      return NextResponse.json({ status: "ignored" });
    }

    if (!event) {
      return NextResponse.json({ status: "ignored" });
    }

    const payment = await prisma.payment.findFirst({
      where: { reference: event.reference },
    });

    if (!payment) {
      console.error("Webhook: Payment not found for reference:", event.reference);
      return NextResponse.json({ status: "not_found" });
    }

    const statusMap: Record<string, string> = {
      successful: "SUCCESSFUL",
      failed: "FAILED",
      cancelled: "CANCELLED",
      pending: "PENDING",
    };

    const newStatus = statusMap[event.status] || "PENDING";

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

    if (newStatus === "SUCCESSFUL" && payment.membershipId) {
      await prisma.membership.update({
        where: { id: payment.membershipId },
        data: {
          status: "ACTIVE",
          activatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ status: "processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ status: "error" });
  }
}
