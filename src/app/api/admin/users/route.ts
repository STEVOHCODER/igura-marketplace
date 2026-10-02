import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified, hashPassword } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limited = enforceRateLimit(request, "admin-users", 30, 60_000);
    if (limited) return limited;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { memberships: true, ownedProperties: true } },
        memberships: {
          where: { status: "ACTIVE" },
          select: { plan: { select: { displayName: true, name: true } } },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        activePlans: u.memberships.map((m) => m.plan.displayName || m.plan.name),
        memberships: undefined,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Creates a user directly (accept path for manually-approved accounts).
 * Mirrors registration rules: unique email/phone, hashed password, and an
 * audit row so the action shows up in the admin log.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, phone, firstName, lastName, password, role } = body || {};

    if (!email || typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const validRoles = ["USER", "CLIENT", "COMMISSIONAIRE", "ADMIN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, ...(phone ? [{ phone }] : [])] },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Email or phone is already registered" }, { status: 409 });
    }

    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        phone: phone || null,
        firstName,
        lastName,
        passwordHash: await hashPassword(password),
        role,
        isActive: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "USER_CREATED",
        targetType: "USER",
        targetId: created.id,
        details: { targetEmail: created.email, role },
      },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
