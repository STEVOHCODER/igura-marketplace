import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Bounded and searchable. This used to be an unbounded findMany that
    // returned every listing with its owner, type and image count in one
    // payload, which stalls the admin table once the catalogue grows.
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const q = (searchParams.get("q") || "").trim();
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          owner: { select: { firstName: true, lastName: true, email: true } },
          marketplace: { select: { displayName: true, name: true } },
          propertyType: { select: { displayName: true } },
          _count: { select: { images: true, reports: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      listings,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      // Distinct marketplace names, so the filter cannot go stale again.
      marketplaces: await prisma.marketplace.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }).then((ms) => ms.map((m) => m.name)),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
