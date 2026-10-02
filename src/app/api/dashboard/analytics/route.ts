import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.userId;

    // Get all user's listings with view counts
    const listings = await prisma.property.findMany({
      where: { ownerId: userId, status: { in: ["ACTIVE", "DRAFT", "UPCOMING", "UNAVAILABLE"] } },
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        createdAt: true,
        price: true,
        marketplace: { select: { displayName: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get contact reveals for user's listings
    const listingIds = listings.map(l => l.id);
    const reveals = await prisma.contactReveal.groupBy({
      by: ["propertyId"],
      where: { propertyId: { in: listingIds } },
      _count: { id: true },
    });
    const revealMap = new Map(reveals.map(r => [r.propertyId, r._count.id]));

    // Total stats
    const totalViews = listings.reduce((sum, l) => sum + l.viewCount, 0);
    const totalReveals = reveals.reduce((sum, r) => sum + r._count.id, 0);
    const activeListings = listings.filter(l => l.status === "ACTIVE").length;

    // Get membership info
    const membership = await prisma.membership.findFirst({
      where: { userId, status: "ACTIVE", plan: { role: "COMMISSIONAIRE" } },
      include: { plan: { select: { name: true, displayName: true, maxActiveListings: true, maxTotalVideos: true, marketplace: { select: { displayName: true } } } } },
      orderBy: { activatedAt: "desc" },
    });

    return NextResponse.json({
      stats: {
        totalViews,
        totalReveals,
        totalListings: listings.length,
        activeListings,
      },
      membership: membership ? {
        plan: membership.plan.displayName,
        marketplace: membership.plan.marketplace.displayName,
        maxListings: membership.plan.maxActiveListings,
        expiresAt: membership.expiresAt,
      } : null,
      listings: listings.map(l => ({
        id: l.id,
        title: l.title,
        status: l.status,
        viewCount: l.viewCount,
        revealCount: revealMap.get(l.id) || 0,
        price: l.price,
        marketplace: l.marketplace.displayName,
        image: l.images[0]?.url || null,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
