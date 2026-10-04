import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignProfileSlug } from "@/lib/profile-slug";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "register", LIMITS.register.limit, LIMITS.register.windowMs);
    if (limited) return limited;

    const body = await request.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // Check for duplicate phone number
    const existingPhone = await prisma.user.findFirst({
      where: { phone: data.phone },
    });

    if (existingPhone) {
      return NextResponse.json(
        { error: "Phone number already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
    });

    // Give them their shareable profile URL straight away. Best-effort: a slug
    // failure must never cost someone their sign-up, and the backfill script
    // plus the lazy path in /agent/[slug] will pick up any gaps.
    try {
      await assignProfileSlug(user.id, user.firstName, user.lastName);
    } catch (slugError) {
      console.error("Could not assign profile slug at registration:", slugError);
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    await setSessionCookie(token);

    const { passwordHash: _, ...userWithoutPassword } = user;

    // See login: the token is served only via the httpOnly cookie.
    return NextResponse.json({ user: userWithoutPassword }, { status: 201 });
  } catch (error: any) {
    if (error?.issues || error?.name === "ZodError" || error?.name === "ZodIssue") {
      const fieldErrors: Record<string, string> = {};
      const issues = error.issues || [];
      for (const issue of issues) {
        const path = issue.path.join(".");
        if (path) fieldErrors[path] = issue.message;
      }
      return NextResponse.json({ error: "Validation failed", errors: fieldErrors, details: error.message }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
