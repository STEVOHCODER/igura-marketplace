import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, adminNote } = body;

    const validStatuses = ["ACTIVE", "DRAFT", "UPCOMING", "UNAVAILABLE", "DELETED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: { status },
    });

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: `PROPERTY_${status}`,
        targetType: "PROPERTY",
        targetId: id,
        details: {
          previousStatus: property.status,
          newStatus: status,
          propertyTitle: property.title,
          adminNote: adminNote || null,
        },
      },
    });

    // Notify the property owner
    await prisma.notification.create({
      data: {
        userId: property.ownerId,
        type: "LISTING_STATUS_CHANGED",
        title: `Listing ${status.toLowerCase()}`,
        message: status === "ACTIVE"
          ? `Your listing "${property.title}" has been approved and is now live.`
          : status === "UNAVAILABLE"
          ? `Your listing "${property.title}" has been taken down. ${adminNote || ""}`
          : `Your listing "${property.title}" status has been updated to ${status.toLowerCase()}.`,
        metadata: { propertyId: id, newStatus: status, adminNote },
      },
    });

    return NextResponse.json({ property: updated });
  } catch (error) {
    console.error("Update property status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
