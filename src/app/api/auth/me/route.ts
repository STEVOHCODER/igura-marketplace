import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

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

    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Get me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
