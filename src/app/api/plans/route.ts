import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPaymentsEnabled } from "@/lib/monetization";

export async function GET() {
  try {
    const plans = await prisma.plan.findMany({
      where: { status: "ACTIVE", role: "COMMISSIONAIRE" },
      include: { marketplace: true },
      orderBy: { price: "asc" },
    });

    return NextResponse.json({ plans, paymentsEnabled: isPaymentsEnabled() });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
