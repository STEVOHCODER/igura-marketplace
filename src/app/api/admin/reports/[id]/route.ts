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

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: body.status,
        adminId: session.userId,
        adminNote: body.adminNote,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "UPDATE_REPORT",
        targetType: "report",
        targetId: id,
        details: { status: body.status },
      },
    });

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
