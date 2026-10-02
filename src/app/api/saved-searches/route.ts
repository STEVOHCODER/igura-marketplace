import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Saved searches. The stored `query` is the listing-filter subset the UI
 * offered when saving: { q, marketplace, district, minPrice, maxPrice,
 * bedroomsMin }. `newMatches` counts ACTIVE listings created after the
 * search itself — the honest, no-push version of alerts: nothing is
 * emailed, the count is computed live on read.
 */
const QUERY_KEYS = ["q", "marketplace", "district", "minPrice", "maxPrice", "bedroomsMin"] as const;

function cleanQuery(input: any): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (typeof input?.q === "string" && input.q.trim()) out.q = input.q.trim().slice(0, 100);
  if (typeof input?.marketplace === "string" && input.marketplace) out.marketplace = input.marketplace;
  if (typeof input?.district === "string" && input.district) out.district = input.district;
  const min = Number(input?.minPrice);
  if (Number.isFinite(min) && min > 0) out.minPrice = Math.floor(min);
  const max = Number(input?.maxPrice);
  if (Number.isFinite(max) && max > 0) out.maxPrice = Math.floor(max);
  const beds = Number(input?.bedroomsMin);
  if (Number.isFinite(beds) && beds >= 0 && beds <= 20) out.bedroomsMin = Math.floor(beds);
  return out;
}

function districtOr(where: any, district: string) {
  // Same hierarchy-wide match as the listing search: users name sectors
  // while listings file them under locationSector.
  where.OR = [
    ...(where.OR || []),
    { locationDistrict: district },
    { locationSector: district },
    { locationCell: district },
    { locationVillage: district },
  ];
}
async function marketplaceIdByName(name: string): Promise<string | null> {
  const m = await prisma.marketplace.findFirst({
    where: { OR: [{ name }, { displayName: name }] },
    select: { id: true },
  });
  return m?.id || null;
}

async function countMatches(query: Record<string, string | number>): Promise<number> {
  const where: any = { status: "ACTIVE" };
  if (typeof query.marketplace === "string") {
    const mid = await marketplaceIdByName(query.marketplace);
    if (!mid) return 0;
    where.marketplaceId = mid;
  }
  if (typeof query.district === "string") districtOr(where, query.district);
  if (typeof query.minPrice === "number" || typeof query.maxPrice === "number") {
    where.price = {};
    if (typeof query.minPrice === "number") where.price.gte = query.minPrice;
    if (typeof query.maxPrice === "number") where.price.lte = query.maxPrice;
  }
  if (typeof query.bedroomsMin === "number") where.bedrooms = { gte: query.bedroomsMin };
  if (typeof query.q === "string") {
    const terms = query.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
    if (terms.length > 0) {
      where.AND = terms.map((term) => ({ searchText: { contains: term, mode: "insensitive" } }));
    }
  }
  return prisma.property.count({ where });
}

async function countNew(query: Record<string, string | number>, since: Date): Promise<number> {
  const where: any = { status: "ACTIVE", createdAt: { gt: since } };
  if (typeof query.marketplace === "string") {
    const mid = await marketplaceIdByName(query.marketplace);
    if (!mid) return 0;
    where.marketplaceId = mid;
  }
  if (typeof query.district === "string") districtOr(where, query.district);
  if (typeof query.minPrice === "number" || typeof query.maxPrice === "number") {
    where.price = {};
    if (typeof query.minPrice === "number") where.price.gte = query.minPrice;
    if (typeof query.maxPrice === "number") where.price.lte = query.maxPrice;
  }
  if (typeof query.bedroomsMin === "number") where.bedrooms = { gte: query.bedroomsMin };
  if (typeof query.q === "string") {
    const terms = query.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6);
    if (terms.length > 0) {
      where.AND = terms.map((term) => ({ searchText: { contains: term, mode: "insensitive" } }));
    }
  }
  return prisma.property.count({ where });
}

export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searches = await prisma.savedSearch.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    const withCounts = await Promise.all(
      searches.map(async (s) => {
        const query = s.query as Record<string, string | number>;
        const [total, fresh] = await Promise.all([
          countMatches(query).catch(() => 0),
          countNew(query, s.createdAt).catch(() => 0),
        ]);
        return {
          id: s.id,
          name: s.name,
          marketplace: s.marketplace,
          query,
          alertsOn: s.alertsOn,
          createdAt: s.createdAt,
          totalMatches: total,
          newMatches: fresh,
        };
      })
    );

    return NextResponse.json({ searches: withCounts });
  } catch (error) {
    console.error("Get saved searches error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "saved-searches", 30, 60_000);
    if (limited) return limited;

    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) {
      return NextResponse.json({ error: "Name your search first" }, { status: 400 });
    }
    const query = cleanQuery(body?.query);
    if (Object.keys(query).length === 0) {
      return NextResponse.json({ error: "Add at least one filter before saving" }, { status: 400 });
    }

    const existing = await prisma.savedSearch.count({ where: { userId: session.userId } });
    if (existing >= 20) {
      return NextResponse.json({ error: "You can save up to 20 searches" }, { status: 400 });
    }

    const created = await prisma.savedSearch.create({
      data: {
        userId: session.userId,
        name,
        marketplace: typeof query.marketplace === "string" ? query.marketplace : null,
        query: query as any,
        alertsOn: true,
      },
    });

    return NextResponse.json({ success: true, search: created }, { status: 201 });
  } catch (error) {
    console.error("Save search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    const owned = await prisma.savedSearch.findFirst({
      where: { id, userId: session.userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    const data: any = {};
    if (typeof body?.alertsOn === "boolean") data.alertsOn = body.alertsOn;
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }
    data.lastRunAt = new Date();

    const updated = await prisma.savedSearch.update({ where: { id }, data });
    return NextResponse.json({ success: true, search: updated });
  } catch (error) {
    console.error("Update saved search error:", error);
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
    const id = searchParams.get("id") || "";
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    await prisma.savedSearch.deleteMany({ where: { id, userId: session.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete saved search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
