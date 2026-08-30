import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const marketplaces = await prisma.marketplace.findMany({
      include: {
        plans: { orderBy: { price: "asc" } },
        _count: { select: { properties: true, plans: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ marketplaces });
  } catch (error) {
    console.error("Get marketplaces error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, displayName, description, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Marketplace ID required" }, { status: 400 });
    }

    const marketplace = await prisma.marketplace.findUnique({ where: { id } });
    if (!marketplace) {
      return NextResponse.json({ error: "Marketplace not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.marketplace.update({ where: { id }, data: updateData });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "MARKETPLACE_UPDATED",
        targetType: "MARKETPLACE",
        targetId: id,
        details: { changes: updateData, marketplaceName: marketplace.name },
      },
    });

    return NextResponse.json({ marketplace: updated });
  } catch (error) {
    console.error("Update marketplace error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
