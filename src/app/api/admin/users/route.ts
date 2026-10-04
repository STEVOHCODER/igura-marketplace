import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProfileSlug } from "@/lib/profile-slug";
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
        profile: { select: { slug: true } },
        _count: { select: { memberships: true, ownedProperties: true } },
        memberships: {
          where: { status: "ACTIVE" },
          select: { plan: { select: { displayName: true, name: true } } },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Self-healing backfill. Accounts created before the shareable-profile
    // feature have no slug, and the admin's job is to hand each commissionaire
    // their link - so fill any gaps here rather than depending on a one-off
    // script someone has to remember to run. assignProfileSlug is idempotent
    // and never rewrites an existing slug, so this is safe on every request.
    //
    // Assigned slugs are collected because the rows above were already read;
    // without this the first request after a backfill would report null.
    const filled = new Map<string, string>();
    for (const u of users) {
      if (u.profile?.slug) continue;
      try {
        filled.set(u.id, await assignProfileSlug(u.id, u.firstName, u.lastName));
      } catch (e) {
        console.error(`Could not backfill profile slug for ${u.email}:`, e);
      }
    }

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        activePlans: u.memberships.map((m) => m.plan.displayName || m.plan.name),
        memberships: undefined,
        // Ready-to-share link, so the admin can hand it over immediately.
        slug: u.profile?.slug ?? filled.get(u.id) ?? null,
        profileUrl: `/agent/${u.profile?.slug ?? filled.get(u.id)}`,
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

    // Every account gets a durable public profile URL, because that link is
    // what an agent shares on WhatsApp and Facebook. Returned so the admin can
    // hand it over with the credentials.
    let slug: string | null = null;
    try {
      slug = await assignProfileSlug(created.id, created.firstName, created.lastName);
    } catch (slugError) {
      console.error("Could not assign profile slug for new user:", slugError);
    }

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "USER_CREATED",
        targetType: "USER",
        targetId: created.id,
        details: { targetEmail: created.email, role },
      },
    });

    return NextResponse.json(
      { user: created, slug, profileUrl: slug ? `/agent/${slug}` : null },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
