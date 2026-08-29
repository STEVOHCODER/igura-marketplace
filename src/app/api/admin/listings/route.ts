import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const listings = await prisma.property.findMany({
      include: {
        owner: { select: { firstName: true, lastName: true, email: true } },
        marketplace: { select: { displayName: true } },
        propertyType: { select: { displayName: true } },
        _count: { select: { images: true, reports: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ listings });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
