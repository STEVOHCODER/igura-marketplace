import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { propertySchema, searchSchema } from "@/lib/validators";
import { generateUniqueSlug, buildSearchText } from "@/lib/utils";
import { getListingAllowance } from "@/lib/access";
import { boundingBox, haversineKm } from "@/lib/geo";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { notify } from "@/lib/notify";

/**
 * Fields safe to return in a list response.
 *
 * `contactPhone` and `contactName` are deliberately absent: list results are
 * public, and including them would hand the paywalled number to anyone who
 * called the API directly.
 */
const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  price: true,
  negotiable: true,
  status: true,
  availabilityStatus: true,
  availabilityDate: true,
  locationDistrict: true,
  locationSector: true,
  locationCell: true,
  locationVillage: true,
  bedrooms: true,
  bathrooms: true,
  areaValue: true,
  areaUnit: true,
  viewCount: true,
  createdAt: true,
  latitude: true,
  longitude: true,
  coordinatesRevealed: true,
  images: { take: 1, orderBy: { sortOrder: "asc" as const } },
  propertyType: true,
  marketplace: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const limited = enforceRateLimit(request, "search", LIMITS.search.limit, LIMITS.search.windowMs);
    if (limited) return limited;

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const filters = searchSchema.parse(query);

    // Everyone can browse listings freely — no membership required.
    // Phone numbers are hidden behind a 2,000 RWF paywall on detail pages.

    const where: any = { status: "ACTIVE" };

    if (filters.marketplace) {
      const allMarketplaces = await prisma.marketplace.findMany({ select: { id: true, name: true } });
      const search = filters.marketplace.toLowerCase().replace(/_/g, " ");
      let match: { id: string; name: string } | undefined;

      for (const m of allMarketplaces) {
        const mName = m.name.toLowerCase();
        if (m.id === filters.marketplace || mName === search || mName.startsWith(search) || search.startsWith(mName) || mName.includes(search) || search.includes(mName)) {
          match = m;
          break;
        }
      }

      if (match) {
        where.marketplaceId = match.id;
      } else {
        return NextResponse.json({ properties: [], total: 0, page: 1, totalPages: 0 });
      }
    }

    if (filters.district) where.locationDistrict = filters.district;
    if (filters.sector) where.locationSector = filters.sector;
    if (filters.cell) where.locationCell = filters.cell;
    if (filters.village) where.locationVillage = filters.village;

    if (filters.propertyType) {
      const allTypes = await prisma.propertyType.findMany({ select: { id: true, slug: true, name: true } });
      const typeSearch = filters.propertyType.toLowerCase().replace(/_/g, " ");
      const typeMatch = allTypes.find(
        (t) => t.id === filters.propertyType || t.slug === filters.propertyType || t.name.toLowerCase() === typeSearch
      );
      if (typeMatch) where.propertyTypeId = typeMatch.id;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    if (filters.availability) where.availabilityStatus = filters.availability;
    if (filters.negotiable !== undefined) where.negotiable = filters.negotiable === "true";

    if (filters.areaMin || filters.areaMax) {
      where.areaValue = {};
      if (filters.areaMin) where.areaValue.gte = filters.areaMin;
      if (filters.areaMax) where.areaValue.lte = filters.areaMax;
    }

    if (filters.bedroomsMin !== undefined) where.bedrooms = { gte: filters.bedroomsMin };
    if (filters.bathroomsMin !== undefined) where.bathrooms = { gte: filters.bathroomsMin };

    // Free text. `searchText` is a denormalised lowercase blob maintained on
    // write, so one indexed `contains` replaces the previous three-way OR
    // across title/description/keywords (which forced a full scan).
    const terms = filters.q
      ? filters.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1).slice(0, 6)
      : [];

    if (terms.length > 0) {
      where.AND = terms.map((term) => ({
        searchText: { contains: term, mode: "insensitive" },
      }));
    }

    // Radius search. Narrow with a bounding box the index can serve, then
    // refine to a true circle with haversine below.
    const geoActive =
      filters.lat !== undefined && filters.lng !== undefined && filters.radiusKm !== undefined;

    if (geoActive) {
      const box = boundingBox(filters.lat!, filters.lng!, filters.radiusKm!);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLng, lte: box.maxLng };
    }

    const orderBy: any = (() => {
      switch (filters.sort) {
        case "price_asc":
          return { price: "asc" };
        case "price_desc":
          return { price: "desc" };
        case "popular":
          return { viewCount: "desc" };
        case "relevance":
        case "distance":
          // Both are scored in memory below; fetch newest-first as the base.
          return { createdAt: "desc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const skip = (filters.page - 1) * filters.limit;

    // Distance and relevance need the full candidate set before they can be
    // ordered and paged, so those two modes fetch a capped window and sort in
    // memory. Everything else pages in the database.
    const needsInMemorySort = geoActive || filters.sort === "relevance" || filters.sort === "distance";
    const IN_MEMORY_CAP = 500;

    if (!needsInMemorySort) {
      const [properties, total] = await Promise.all([
        prisma.property.findMany({ where, select: LIST_SELECT, orderBy, skip, take: filters.limit }),
        prisma.property.count({ where }),
      ]);

      return NextResponse.json({
        properties: properties.map(stripHiddenCoords),
        total,
        page: filters.page,
        totalPages: Math.ceil(total / filters.limit),
      });
    }

    const candidates = await prisma.property.findMany({
      where,
      select: LIST_SELECT,
      orderBy,
      take: IN_MEMORY_CAP,
    });

    let scored = candidates.map((p) => {
      const distanceKm =
        geoActive && p.latitude != null && p.longitude != null
          ? haversineKm(filters.lat!, filters.lng!, p.latitude, p.longitude)
          : null;
      return { ...p, distanceKm, score: relevanceScore(p, terms) };
    });

    // Bounding box is a square around a circle, so trim the corners.
    if (geoActive) {
      scored = scored.filter((p) => p.distanceKm != null && p.distanceKm <= filters.radiusKm!);
    }

    if (filters.sort === "distance" && geoActive) {
      scored.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else if (filters.sort === "relevance") {
      scored.sort((a, b) => b.score - a.score || +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    const total = scored.length;
    const paged = scored.slice(skip, skip + filters.limit).map(stripHiddenCoords);

    return NextResponse.json({
      properties: paged,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
      capped: candidates.length >= IN_MEMORY_CAP,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid query parameters", details: error.message }, { status: 400 });
    }
    console.error("List properties error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Cheap TF-style relevance score.
 *
 * Title matches count more than description matches, exact whole-word matches
 * count more than substring matches, and a small recency bonus breaks ties in
 * favour of fresh listings.
 */
function relevanceScore(
  property: { title: string; description: string | null; locationDistrict: string | null; locationSector: string | null; createdAt: Date; viewCount: number },
  terms: string[]
): number {
  if (terms.length === 0) return 0;

  const title = property.title.toLowerCase();
  const description = (property.description || "").toLowerCase();
  const location = `${property.locationSector || ""} ${property.locationDistrict || ""}`.toLowerCase();

  let score = 0;

  for (const term of terms) {
    const wordBoundary = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);

    if (wordBoundary.test(title)) score += 10;
    else if (title.includes(term)) score += 6;

    if (wordBoundary.test(location)) score += 5;
    if (description.includes(term)) score += 2;
  }

  // Recency: full bonus today, decaying to zero over 30 days.
  const ageDays = (Date.now() - +new Date(property.createdAt)) / 86_400_000;
  score += Math.max(0, 3 - ageDays / 10);

  // Mild popularity nudge, capped so a viral listing cannot dominate.
  score += Math.min(2, Math.log10(property.viewCount + 1));

  return score;
}

/** Coordinates stay hidden unless the owner published them. */
function stripHiddenCoords<T extends { coordinatesRevealed: boolean; latitude: number | null; longitude: number | null }>(p: T): T {
  if (p.coordinatesRevealed) return p;
  return { ...p, latitude: null, longitude: null };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const limited = enforceRateLimit(
      request,
      "property-create",
      LIMITS.write.limit,
      LIMITS.write.windowMs,
      session.userId
    );
    if (limited) return limited;

    const body = await request.json();
    const data = propertySchema.parse(body);

    // Quota and free-period logic lives in one place now, and it honours
    // membership expiry rather than trusting a stored ACTIVE status forever.
    const allowance = await getListingAllowance(session.userId);

    if (!allowance.allowed) {
      return NextResponse.json({ error: allowance.reason || "Not allowed to create listings" }, { status: 403 });
    }

    const marketplace = await prisma.marketplace.findFirst({ where: { name: data.marketplace } });

    if (!marketplace) {
      return NextResponse.json({ error: "Marketplace not found" }, { status: 400 });
    }

    const searchText = buildSearchText({
      title: data.title,
      description: data.description,
      keywords: data.keywords,
      district: data.locationDistrict,
      sector: data.locationSector,
      cell: data.locationCell,
      village: data.locationVillage,
    });

    const tempProperty = await prisma.property.create({
      data: {
        ownerId: session.userId,
        marketplaceId: marketplace.id,
        slug: `pending-${Date.now()}`,
        title: data.title,
        description: data.description,
        propertyTypeId: data.propertyTypeId,
        price: data.price,
        negotiable: data.negotiable,
        status: "DRAFT",
        searchText,
        availabilityStatus: data.availabilityStatus,
        availabilityDate: data.availabilityDate ? new Date(data.availabilityDate) : null,
        latitude: data.latitude,
        longitude: data.longitude,
        coordinatesRevealed: data.coordinatesRevealed,
        locationCountry: data.locationCountry,
        locationDistrict: data.locationDistrict,
        locationSector: data.locationSector,
        locationCell: data.locationCell,
        locationVillage: data.locationVillage,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaValue: data.areaValue,
        areaUnit: data.areaUnit as any,
      },
    });

    const slug = generateUniqueSlug(data.title, tempProperty.id);

    const property = await prisma.property.update({
      where: { id: tempProperty.id },
      data: { slug },
      include: { images: true, propertyType: true, marketplace: true },
    });

    if (data.keywords && data.keywords.length > 0) {
      await prisma.propertyKeyword.createMany({
        data: data.keywords.map((keyword) => ({ propertyId: property.id, keyword })),
      });
    }

    if (data.plotPurpose) {
      await prisma.propertyFeature.create({
        data: { propertyId: property.id, feature: "purpose", value: data.plotPurpose },
      });
    }

    return NextResponse.json(
      {
        property,
        allowance: {
          isFreePeriod: allowance.isFreePeriod,
          maxImagesPerListing: allowance.maxImagesPerListing,
          remaining: allowance.maxActiveListings - allowance.activeListings - 1,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.message }, { status: 400 });
    }
    console.error("Create property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
