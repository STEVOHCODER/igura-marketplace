import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "login", LIMITS.login.limit, LIMITS.login.windowMs);
    if (limited) return limited;

    const body = await request.json();
    const data = loginSchema.parse(body);

    // Per-account rate limiting (in addition to per-IP)
    const accountLimited = enforceRateLimit(
      request,
      `login-account:${data.email}`,
      LIMITS.login.limit,
      LIMITS.login.windowMs
    );
    if (accountLimited) return accountLimited;

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account has been deactivated" },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(data.password, user.passwordHash);

    if (!isValid) {
      // Failed logins are the precursor to credential stuffing — record them
      // so the pattern is visible in logs. Never log the password itself.
      console.warn(
        `[auth] Failed login email=${data.email} ip=${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`
      );
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    await setSessionCookie(token);

    const { passwordHash: _, ...userWithoutPassword } = user;

    // The session lives in the httpOnly cookie only. Returning the raw token
    // here invites client-side storage in localStorage, where any XSS can
    // exfiltrate it and defeat the httpOnly protection.
    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.message }, { status: 400 });
    }
    console.error("Login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
