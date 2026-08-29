import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users, listings, payments, reports] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.payment.count(),
      prisma.report.count(),
    ]);

    return NextResponse.json({ users, listings, payments, reports });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
