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
    const { role, isActive } = body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (id === session.userId && role && role !== user.role) {
      return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
    }

    const updateData: any = {};
    if (role !== undefined) {
      const validRoles = ["USER", "ADMIN", "SUPER_ADMIN", "CLIENT", "COMMISSIONAIRE"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      updateData.role = role;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log the admin action
    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: role ? "USER_ROLE_CHANGED" : isActive ? "USER_ACTIVATED" : "USER_SUSPENDED",
        targetType: "USER",
        targetId: id,
        details: {
          previousRole: user.role,
          newRole: role || user.role,
          previousActive: user.isActive,
          newActive: isActive !== undefined ? isActive : user.isActive,
          targetEmail: user.email,
        },
      },
    });

    const { passwordHash, ...userWithoutPassword } = updated;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
