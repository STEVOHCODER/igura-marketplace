import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const marketplaceName = searchParams.get("marketplace");

    const where: any = {
      status: "ACTIVE",
    };

    if (marketplaceName) {
      where.marketplace = { name: marketplaceName };
    }

    const propertyTypes = await prisma.propertyType.findMany({
      where,
      include: {
        marketplace: {
          select: { id: true, name: true, displayName: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ propertyTypes });
  } catch (error) {
    console.error("Get property types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
