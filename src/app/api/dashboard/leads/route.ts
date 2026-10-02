import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

/**
 * Owner lead inbox: every paid contact reveal on the caller's properties —
 * who asked, for which listing, when, and for how much. Derived entirely
 * from the ContactReveal trail plus reveal-type payments still pending, so
 * owners see interest even before it settles.
 */
export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const mine = await prisma.property.findMany({
      where: { ownerId: session.userId },
      select: { id: true },
    });
    const propertyIds = mine.map((p) => p.id);
    if (propertyIds.length === 0) {
      return NextResponse.json({ leads: [] });
    }

    const reveals = await prisma.contactReveal.findMany({
      where: { propertyId: { in: propertyIds } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        property: { select: { id: true, slug: true, title: true, price: true, marketplace: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      leads: reveals.map((r) => ({
        id: r.id,
        buyerName: `${r.user.firstName} ${r.user.lastName}`,
        buyerPhone: r.user.phone,
        buyerEmail: r.user.email,
        propertyId: r.property.id,
        propertySlug: r.property.slug,
        propertyTitle: r.property.title,
        marketplace: r.property.marketplace.name,
        amount: r.amount,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get leads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
