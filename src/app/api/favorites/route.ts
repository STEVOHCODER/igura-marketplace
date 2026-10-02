import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  price: true,
  negotiable: true,
  availabilityStatus: true,
  availabilityDate: true,
  locationDistrict: true,
  locationSector: true,
  bedrooms: true,
  bathrooms: true,
  areaValue: true,
  areaUnit: true,
  videoUrl: true,
  createdAt: true,
  ownerId: true,
  status: true,
  marketplace: { select: { name: true, displayName: true } },
  propertyType: { select: { displayName: true } },
  images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true, altText: true } },
};

/** Owners holding a live commissionaire membership — the only backend
 *  state allowed to render a "verified owner" badge. */
async function verifiedOwnerIds(ownerIds: string[]): Promise<Set<string>> {
  if (ownerIds.length === 0) return new Set();
  const rows = await prisma.membership.findMany({
    where: { userId: { in: ownerIds }, status: "ACTIVE" },
    select: { userId: true, expiresAt: true },
  });
  const now = new Date();
  return new Set(rows.filter((r) => !r.expiresAt || r.expiresAt > now).map((r) => r.userId));
}

export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const favs = await prisma.favorite.findMany({
      where: { userId: session.userId },
      include: { property: { select: CARD_SELECT } },
      orderBy: { createdAt: "desc" },
    });

    const verified = await verifiedOwnerIds(favs.map((f) => f.property.ownerId));

    return NextResponse.json({
      favorites: favs
        .filter((f) => f.property.status === "ACTIVE")
        .map((f) => ({ ...f.property, verifiedOwner: verified.has(f.property.ownerId) })),
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "favorites", 60, 60_000);
    if (limited) return limited;

    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const propertyId = typeof body?.propertyId === "string" ? body.propertyId : "";
    if (!/^[0-9a-fA-F]{24}$/.test(propertyId)) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Check-then-create instead of relying on the unique index alone: the
    // @@unique([userId, propertyId]) constraint may be missing in databases
    // seeded before it was added (schema pushes are deployment-gated), and
    // without this guard double taps create duplicate rows.
    const existing = await prisma.favorite.findFirst({
      where: { userId: session.userId, propertyId },
      select: { id: true },
    });
    if (!existing) {
      try {
        await prisma.favorite.create({
          data: { userId: session.userId, propertyId },
        });
      } catch {
        // Lost a race with another tap — the row exists now either way.
      }
    }

    return NextResponse.json({ success: true, saved: true });
  } catch (error) {
    console.error("Save favorite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId") || "";
    if (!/^[0-9a-fA-F]{24}$/.test(propertyId)) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    await prisma.favorite.deleteMany({
      where: { userId: session.userId, propertyId },
    });

    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    console.error("Remove favorite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
