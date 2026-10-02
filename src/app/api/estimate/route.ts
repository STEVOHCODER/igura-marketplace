import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

/**
 * Igura Value Estimate (comparables median).
 *
 * No model, no guarantee: takes live ACTIVE listings in the same
 * marketplace and area, prefers the same property type and bedroom count,
 * and reports the median with an interquartile range. Fewer than 3
 * comparables → honest "not enough data" instead of a made-up number.
 */
export async function GET(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "search", LIMITS.search.limit, LIMITS.search.windowMs);
    if (limited) return limited;

    const sp = new URL(request.url).searchParams;
    const marketplace = sp.get("marketplace") || "";
    const district = sp.get("district") || "";
    const sector = sp.get("sector") || "";
    const propertyType = sp.get("propertyType") || "";
    const bedrooms = sp.get("bedrooms") ? Number(sp.get("bedrooms")) : undefined;
    const exclude = sp.get("exclude") || "";

    if (!marketplace) {
      return NextResponse.json({ error: "marketplace is required" }, { status: 400 });
    }

    const market = await prisma.marketplace.findFirst({
      where: { OR: [{ name: marketplace }, { displayName: marketplace }] },
      select: { id: true },
    });
    if (!market) {
      return NextResponse.json({ error: "Unknown marketplace" }, { status: 404 });
    }

    const areaOr: any[] = [];
    if (sector) areaOr.push({ locationSector: sector });
    if (district) areaOr.push({ locationDistrict: district });

    const where: any = { status: "ACTIVE", marketplaceId: market.id };
    if (areaOr.length > 0) where.OR = areaOr;
    if (propertyType) {
      const pt = await prisma.propertyType.findFirst({
        where: {
          OR: [{ id: propertyType }, { slug: propertyType }],
          marketplaceId: market.id,
        },
        select: { id: true },
      });
      if (pt) where.propertyTypeId = pt.id;
    }
    if (bedrooms !== undefined && Number.isFinite(bedrooms)) {
      where.bedrooms = { gte: Math.max(0, bedrooms - 1), lte: bedrooms + 1 };
    }

    const comps = await prisma.property.findMany({
      where,
      select: { id: true, price: true },
      take: 50,
    });
    const prices = comps
      .filter((c) => c.id !== exclude)
      .map((c) => c.price)
      .sort((a, b) => a - b);

    if (prices.length < 3) {
      return NextResponse.json({
        available: false,
        count: prices.length,
        message: "Not enough comparable listings in this area yet.",
      });
    }

    const median = prices[Math.floor(prices.length / 2)];
    const q1 = prices[Math.floor(prices.length / 4)];
    const q3 = prices[Math.floor((prices.length * 3) / 4)];

    const factors: string[] = ["Same marketplace"];
    if (sector || district) factors.push(`Area: ${sector || district}`);
    if (propertyType) factors.push("Same property type");
    if (bedrooms !== undefined && Number.isFinite(bedrooms)) factors.push(`≈ ${bedrooms} bedrooms`);

    return NextResponse.json({
      available: true,
      estimate: median,
      low: q1,
      high: q3,
      count: prices.length,
      factors,
      disclaimer: "Estimate from listed asking prices, not completed sales. Not a valuation or guarantee.",
    });
  } catch (error) {
    console.error("Estimate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
