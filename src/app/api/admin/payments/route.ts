import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payments = await prisma.payment.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        plan: { select: { displayName: true, marketplace: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
