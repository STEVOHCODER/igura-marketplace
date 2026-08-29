import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { reportSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const data = reportSchema.parse(body);

    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: session.userId,
        propertyId: data.propertyId,
        status: { in: ["PENDING", "REVIEWED"] },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this property" },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.userId,
        propertyId: data.propertyId,
        reason: data.reason,
        description: data.description,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.message }, { status: 400 });
    }
    console.error("Create report error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
