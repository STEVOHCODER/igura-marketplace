import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actionType = searchParams.get("actionType") || undefined;
    const targetType = searchParams.get("targetType") || undefined;

    const where: any = {};
    if (actionType) where.actionType = actionType;
    if (targetType) where.targetType = targetType;

    const [actions, total] = await Promise.all([
      prisma.adminAction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          admin: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.adminAction.count({ where }),
    ]);

    // Get unique action types for filter dropdown
    const actionTypes = await prisma.adminAction.findMany({
      select: { actionType: true },
      distinct: ["actionType"],
      orderBy: { actionType: "asc" },
    });

    return NextResponse.json({
      actions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      actionTypes: actionTypes.map((a) => a.actionType),
    });
  } catch (error) {
    console.error("Get audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
