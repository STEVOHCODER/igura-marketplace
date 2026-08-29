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

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: body.isActive },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: body.isActive ? "ACTIVATE_USER" : "SUSPEND_USER",
        targetType: "user",
        targetId: id,
        details: { email: user.email },
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
