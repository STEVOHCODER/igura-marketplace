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
    const { status, adminNote, actionOnProperty } = body;

    const validStatuses = ["PENDING", "RESOLVED", "DISMISSED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { property: true, reporter: true },
    });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status,
        adminId: session.userId,
        adminNote: adminNote || report.adminNote,
      },
    });

    // Take action on the reported property if requested
    if (actionOnProperty && report.property) {
      const propertyUpdate: any = {};
      let actionType = "";

      switch (actionOnProperty) {
        case "HIDE":
          propertyUpdate.status = "UNAVAILABLE";
          actionType = "PROPERTY_HIDDEN_VIA_REPORT";
          break;
        case "REMOVE":
          propertyUpdate.status = "DELETED";
          actionType = "PROPERTY_REMOVED_VIA_REPORT";
          break;
        case "FLAG":
          actionType = "PROPERTY_FLAGGED";
          break;
      }

      if (Object.keys(propertyUpdate).length > 0) {
        await prisma.property.update({
          where: { id: report.propertyId },
          data: propertyUpdate,
        });

        // Notify the property owner
        await prisma.notification.create({
          data: {
            userId: report.property.ownerId,
            type: "LISTING_ACTION",
            title: actionOnProperty === "REMOVE" ? "Listing removed" : "Listing hidden",
            message: actionOnProperty === "REMOVE"
              ? `Your listing "${report.property.title}" has been removed due to a report. ${adminNote || ""}`
              : `Your listing "${report.property.title}" has been hidden due to a report. ${adminNote || ""}`,
            metadata: { propertyId: report.propertyId, reportId: id, action: actionOnProperty },
          },
        });
      }

      // Log the admin action
      await prisma.adminAction.create({
        data: {
          adminId: session.userId,
          actionType,
          targetType: "REPORT",
          targetId: id,
          details: {
            reportReason: report.reason,
            propertyTitle: report.property.title,
            propertyId: report.propertyId,
            actionOnProperty,
            adminNote,
          },
        },
      });
    }

    // Log the report resolution
    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: `REPORT_${status}`,
        targetType: "REPORT",
        targetId: id,
        details: {
          reportReason: report.reason,
          propertyTitle: report.property?.title,
          reporterName: `${report.reporter.firstName} ${report.reporter.lastName}`,
          adminNote,
          actionOnProperty: actionOnProperty || null,
        },
      },
    });

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error("Update report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
