import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, price, displayName, maxActiveListings, maxImagesPerListing, features, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (price !== undefined) updateData.price = price;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (maxActiveListings !== undefined) updateData.maxActiveListings = maxActiveListings;
    if (maxImagesPerListing !== undefined) updateData.maxImagesPerListing = maxImagesPerListing;
    if (features !== undefined) updateData.features = features;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.plan.update({ where: { id }, data: updateData });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "PLAN_UPDATED",
        targetType: "PLAN",
        targetId: id,
        details: { changes: updateData, planName: plan.name, previousPrice: plan.price },
      },
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("Update plan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
