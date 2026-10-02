import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified, verifyPassword, hashPassword } from "@/lib/auth";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionVerified();

    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limited = enforceRateLimit(
      request,
      "change-password",
      LIMITS.login.limit,
      LIMITS.login.windowMs,
      session.userId
    );
    if (limited) return limited;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    // Match registration password strength requirements
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password must contain at least one uppercase letter" },
        { status: 400 }
      );
    }
    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password must contain at least one lowercase letter" },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "New password must contain at least one number" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from current password" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    // Bumping tokenVersion invalidates every token minted before this point,
    // so a token stolen earlier (XSS, shared machine, leaked log) dies now
    // instead of living out its full 7 days.
    //
    // Written as an absolute value, not `{ increment: 1 }`: with the mongodb
    // preview adapter, incrementing a field that is absent from a document
    // (which is every user created before this column existed) silently
    // no-ops, so the bump never lands and stale tokens keep working.
    const current = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { tokenVersion: true },
    });

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, tokenVersion: (current?.tokenVersion ?? 0) + 1 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
