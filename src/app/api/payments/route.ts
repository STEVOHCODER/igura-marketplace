import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { sweepStalePending } from "@/lib/pending-payments";

/**
 * The buyer's own payment ledger: one place to see what happened to every
 * attempt (reference, amount, status, when), newest first. Stuck PENDINGs
 * older than the TTL are expired on read so this list never shows a row
 * that can no longer settle.
 */
export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await sweepStalePending();

    const payments = await prisma.payment.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        reference: true,
        amount: true,
        currency: true,
        method: true,
        provider: true,
        status: true,
        createdAt: true,
        metadata: true,
        plan: { select: { displayName: true } },
      },
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        provider: p.provider,
        status: p.status,
        createdAt: p.createdAt,
        planName: p.plan?.displayName || null,
        kind:
          (p.metadata as Record<string, unknown> | null)?.type === "phone_reveal"
            ? "reveal"
            : "membership",
      })),
    });
  } catch (error) {
    console.error("Get payments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
