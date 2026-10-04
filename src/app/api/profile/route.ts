import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { isAdmin } from "@/lib/ownership";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { profileSchema } from "@/lib/validators";

/**
 * Read the signed-in user's own profile.
 *
 * Admins may pass ?userId= to read another account, which is how the
 * commissionaire maintenance form is populated.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const requested = request.nextUrl.searchParams.get("userId")?.trim();
    const targetUserId = requested && requested !== session.userId ? requested : session.userId;

    if (targetUserId !== session.userId && !isAdmin(session)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        profile: { select: { id: true, slug: true, bio: true, address: true, district: true, avatarUrl: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user, profile: user.profile });
  } catch (error) {
    console.error("Profile read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Edit the signed-in user's public profile.
 *
 * Deliberately does not accept a slug. The slug is the agent's shareable link
 * and may already be printed on a flyer, so it is assigned once (see
 * profile-slug.ts) and is not editable from here.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limited = enforceRateLimit(
      request,
      "profile-update",
      LIMITS.write.limit,
      LIMITS.write.windowMs,
      session.userId
    );
    if (limited) return limited;

    const body = await request.json();

    // Admins maintain commissionaires' details on their behalf, so they may
    // target another account - but only ever one other account, and only the
    // profile fields, never credentials or role.
    const targetUserId =
      isAdmin(session) && typeof body?.userId === "string" && body.userId.trim()
        ? body.userId.trim()
        : session.userId;

    if (targetUserId !== session.userId && !isAdmin(session)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, phone: true, firstName: true, lastName: true, profile: { select: { id: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Phone is unique on User, so changing it can collide with another account.
    if (data.phone && data.phone !== target.phone) {
      const clash = await prisma.user.findFirst({
        where: { phone: data.phone, NOT: { id: targetUserId } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "That phone number is already used by another account" },
          { status: 409 }
        );
      }
    }

    const userData: Record<string, unknown> = {};
    if (data.firstName !== undefined) userData.firstName = data.firstName.trim();
    if (data.lastName !== undefined) userData.lastName = data.lastName.trim();
    if (data.phone !== undefined) userData.phone = data.phone.trim();
    // A changed number has not been re-verified, so any previous verification
    // no longer refers to the number now on the account.
    if (data.phone !== undefined && data.phone !== target.phone) userData.phoneVerified = false;

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: targetUserId }, data: userData });
    }

    const profileData = {
      ...(data.bio !== undefined ? { bio: data.bio } : {}),
      ...(data.address !== undefined ? { address: data.address } : {}),
      ...(data.district !== undefined ? { district: data.district } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    };

    const profile =
      Object.keys(profileData).length > 0
        ? await prisma.profile.upsert({
            where: { userId: targetUserId },
            create: { userId: targetUserId, ...profileData },
            update: profileData,
          })
        : target.profile;

    if (isAdmin(session) && targetUserId !== session.userId) {
      await prisma.adminAction.create({
        data: {
          adminId: session.userId,
          actionType: "PROFILE_UPDATED_FOR_OWNER",
          targetType: "USER",
          targetId: targetUserId,
          details: { fields: Object.keys(profileData), onBehalf: true },
        },
      });
    }

    return NextResponse.json({ ok: true, profile, userId: targetUserId });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
