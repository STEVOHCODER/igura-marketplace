import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    // Auto-create a pending membership for the chosen marketplace + role
    const plan = await prisma.plan.findFirst({
      where: {
        marketplace: { name: data.marketplace },
        role: data.role,
        status: "ACTIVE",
      },
    });

    if (plan) {
      await prisma.membership.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "PENDING",
        },
      });
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
