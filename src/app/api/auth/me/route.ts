import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified, createToken, setSessionCookie } from "@/lib/auth";

export async function GET() {
  try {
    // Verified, not just signed: getSessionVerified re-checks tokenVersion
    // against the DB, so a token minted before a password change is rejected
    // here even though its signature is still valid.
    const session = await getSessionVerified();

    if (!session) {
      // 200, not 401: "who am I" with no session is a valid question with a
      // null answer, and every public page asks it on mount. A 401 here only
      // spams the console without changing any caller behaviour.
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
        memberships: {
          include: {
            plan: {
              include: {
                marketplace: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Self-heal a stale role claim. The JWT embeds the role as it was when the
    // token was minted, but middleware reads that claim to gate /admin. So an
    // account promoted to ADMIN after it signed in kept a token that still said
    // "USER" and was bounced to /dashboard every single time - no amount of
    // reloading fixed it, only signing out. Re-mint with the live role so the
    // token catches up on the first page load after the promotion.
    if (session.role !== user.role) {
      try {
        await setSessionCookie(
          await createToken({
            userId: user.id,
            email: user.email,
            role: user.role,
            tokenVersion: user.tokenVersion,
          })
        );
      } catch (error) {
        // A failed refresh must never break "who am I" - the caller still gets
        // correct data, and the old token keeps working.
        console.error("Session role self-heal failed:", error);
      }
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
