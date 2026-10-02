import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Bounded for the same reason as the listings table: an unbounded findMany
    // joined to user and plan cannot stay responsive as the ledger grows.
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          plan: { select: { displayName: true, marketplace: { select: { displayName: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({ payments, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
