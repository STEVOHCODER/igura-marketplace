import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { propertySchema, searchSchema } from "@/lib/validators";
import { generateUniqueSlug } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const filters = searchSchema.parse(query);

    // Everyone can browse listings freely — no membership required
    // Phone numbers are hidden behind a 2,000 RWF paywall on detail pages

    const where: any = {
      status: "ACTIVE",
    };

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

    if (filters.district) {
      where.locationDistrict = filters.district;
    }

    if (filters.sector) {
      where.locationSector = filters.sector;
    }

    if (filters.cell) {
      where.locationCell = filters.cell;
    }

    if (filters.village) {
      where.locationVillage = filters.village;
    }

    if (filters.propertyType) {
      const allTypes = await prisma.propertyType.findMany({ select: { id: true, slug: true, name: true } });
      const typeSearch = filters.propertyType.toLowerCase().replace(/_/g, " ");
      const typeMatch = allTypes.find(
        (t) => t.id === filters.propertyType || t.slug === filters.propertyType || t.name.toLowerCase() === typeSearch
      );
      if (typeMatch) {
        where.propertyTypeId = typeMatch.id;
      }
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }

    if (filters.availability) {
      where.availabilityStatus = filters.availability;
    }

    if (filters.negotiable !== undefined) {
      where.negotiable = filters.negotiable === "true";
    }

    if (filters.areaMin || filters.areaMax) {
      where.areaValue = {};
      if (filters.areaMin) where.areaValue.gte = filters.areaMin;
      if (filters.areaMax) where.areaValue.lte = filters.areaMax;
    }

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { keywords: { some: { keyword: { contains: filters.q, mode: "insensitive" } } } },
      ];
    }

    const orderBy: any = (() => {
      switch (filters.sort) {
        case "price_asc":
          return { price: "asc" };
        case "price_desc":
          return { price: "desc" };
        case "popular":
          return { viewCount: "desc" };
        default:
          return { createdAt: "desc" };
      }
    })();

    const skip = (filters.page - 1) * filters.limit;

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          images: { take: 1, orderBy: { sortOrder: "asc" } },
          propertyType: true,
          marketplace: true,
        },
        orderBy,
        skip,
        take: filters.limit,
      }),
      prisma.property.count({ where }),
    ]);

    return NextResponse.json({
      properties,
      total,
      page: filters.page,
      totalPages: Math.ceil(total / filters.limit),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid query parameters", details: error.message }, { status: 400 });
    }
    console.error("List properties error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const data = propertySchema.parse(body);

    // Allow commissionaires to list freely for 1 month after registration
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const isFreePeriod = user.createdAt > oneMonthAgo;

    if (!isFreePeriod) {
      // After 1 month, require active COMMISSIONAIRE membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: session.userId,
          status: "ACTIVE",
          plan: { role: "COMMISSIONAIRE" },
        },
        include: { plan: true },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Your free listing period has ended. Please purchase a membership to continue listing." },
          { status: 403 }
        );
      }

      const activeListingsCount = await prisma.property.count({
        where: {
          ownerId: session.userId,
          status: { in: ["ACTIVE", "DRAFT", "UPCOMING"] },
        },
      });

      if (activeListingsCount >= membership.plan.maxActiveListings) {
        return NextResponse.json(
          { error: `Listing limit reached. Your plan allows ${membership.plan.maxActiveListings} active listings.` },
          { status: 403 }
        );
      }
    } else {
      // Free period: limit to 10 active listings
      const activeListingsCount = await prisma.property.count({
        where: {
          ownerId: session.userId,
          status: { in: ["ACTIVE", "DRAFT", "UPCOMING"] },
        },
      });

      if (activeListingsCount >= 10) {
        return NextResponse.json(
          { error: "Free listing limit reached (10). Upgrade to a membership for more listings." },
          { status: 403 }
        );
      }
    }

    // Find marketplace by name from the submitted data
    const marketplace = await prisma.marketplace.findFirst({
      where: { name: data.marketplace },
    });

    if (!marketplace) {
      return NextResponse.json({ error: "Marketplace not found" }, { status: 400 });
    }

    const tempProperty = await prisma.property.create({
      data: {
        ownerId: session.userId,
        marketplaceId: marketplace.id,
        slug: "temp",
        title: data.title,
        description: data.description,
        propertyTypeId: data.propertyTypeId,
        price: data.price,
        negotiable: data.negotiable,
        status: "DRAFT",
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
      include: {
        images: true,
        propertyType: true,
        marketplace: true,
      },
    });

    if (data.keywords && data.keywords.length > 0) {
      await prisma.propertyKeyword.createMany({
        data: data.keywords.map((keyword) => ({
          propertyId: property.id,
          keyword,
        })),
      });
    }

    if (data.plotPurpose) {
      await prisma.propertyFeature.create({
        data: {
          propertyId: property.id,
          feature: "purpose",
          value: data.plotPurpose,
        },
      });
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.message }, { status: 400 });
    }
    console.error("Create property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
