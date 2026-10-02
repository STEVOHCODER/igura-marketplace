import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionVerified();
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

    // Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === "SUPER_ADMIN" && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can assign Super Admin role" }, { status: 403 });
    }

    // Only SUPER_ADMIN can deactivate other admins
    if (isActive === false && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can deactivate admins" }, { status: 403 });
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

    // Suspension has to end live access, not just block the next login: the
    // session check only compares tokenVersion, and JWTs live for 7 days, so
    // without this bump a suspended user keeps full API access all week.
    // Reactivation also bumps, which forces a fresh sign-in either way.
    if (isActive !== undefined || role !== undefined) {
      updateData.tokenVersion = (user as any).tokenVersion + 1;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Log the admin action. One row per concern: sending role and isActive
    // together previously logged only the role change, hiding the status flip
    // from the audit trail entirely.
    const base = {
      adminId: session.userId,
      targetType: "USER",
      targetId: id,
      details: {
        previousRole: user.role,
        newRole: role || user.role,
        previousActive: user.isActive,
        newActive: isActive !== undefined ? isActive : user.isActive,
        targetEmail: user.email,
      },
    };
    const actions: string[] = [];
    if (role !== undefined && role !== user.role) actions.push("USER_ROLE_CHANGED");
    if (isActive === false) actions.push("USER_SUSPENDED");
    if (isActive === true) actions.push("USER_ACTIVATED");
    for (const actionType of actions) {
      await prisma.adminAction.create({ data: { ...base, actionType } });
    }

    const { passwordHash, ...userWithoutPassword } = updated;
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Deletes a user (deny/remove path). Guarded: never self, never an admin
 * unless the caller is SUPER_ADMIN. Prisma cascades wipe the user's
 * listings, payments, memberships and reveals with the row.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (id === session.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Super Admin can delete admins" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "USER_DELETED",
        targetType: "USER",
        targetId: id,
        details: { targetEmail: user.email, role: user.role },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
