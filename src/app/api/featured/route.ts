import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Featured = top 6 most-viewed ACTIVE listings
    const listings = await prisma.property.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        slug: true,
        title: true,
        price: true,
        viewCount: true,
        locationDistrict: true,
        locationSector: true,
        bedrooms: true,
        bathrooms: true,
        areaValue: true,
        areaUnit: true,
        ownerId: true,
        createdAt: true,
        negotiable: true,
        availabilityStatus: true,
        videoUrl: true,
        marketplace: { select: { name: true, displayName: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true } },
        propertyType: { select: { displayName: true } },
      },
      orderBy: { viewCount: "desc" },
      take: 6,
    });

    const ownerIds = [...new Set(listings.map((l) => l.ownerId))];
    const memberships = await prisma.membership.findMany({
      where: { userId: { in: ownerIds }, status: "ACTIVE" },
      select: { userId: true, expiresAt: true },
    });
    const now = new Date();
    const verified = new Set(
      memberships.filter((m) => !m.expiresAt || m.expiresAt > now).map((m) => m.userId)
    );

    return NextResponse.json({
      listings: listings.map((l) => ({ ...l, verifiedOwner: verified.has(l.ownerId) })),
    });
  } catch (error) {
    console.error("Featured listings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
