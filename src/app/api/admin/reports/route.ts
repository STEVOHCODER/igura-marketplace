import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = enforceRateLimit(request, "admin-reports", 30, 60_000);
    if (limited) return limited;

    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { firstName: true, lastName: true, email: true } },
        property: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
