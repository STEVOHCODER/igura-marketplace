import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchText } from "@/lib/utils";

/**
 * Everything the landing page needs, in one response.
 *
 * The homepage used to fan out to a dozen separate client fetches on mount -
 * locations, property types, featured, recent, a total count, favourites, and
 * one request per popular-location tile. Each was a separate cold serverless
 * invocation with its own MongoDB round trip, so the page painted only after
 * the slowest of them finished. Collapsing them here turns N network round
 * trips into one while keeping the queries parallel on the server.
 *
 * Everything here is public and non-sensitive, so it is cached briefly.
 */

const POPULAR_TILES = [
  { label: "Gasabo", sector: "Gasabo" },
  { label: "Kicukiro", sector: "Kicukiro" },
  { label: "Nyarugenge", sector: "Nyarugenge" },
  { label: "Bugesera", district: "Bugesera" },
  { label: "Musanze", district: "Musanze" },
  { label: "Rubavu", district: "Rubavu" },
];

const LISTING_SELECT = {
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
  marketplace: { select: { name: true, displayName: true } },
  propertyType: { select: { displayName: true } },
  images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { url: true, altText: true } },
} as const;

export async function GET() {
  try {
    const [
      districts,
      propertyTypes,
      featured,
      recent,
      totalActive,
      ...tileCounts
    ] = await Promise.all([
      prisma.locationHierarchy.findMany({
        where: { level: "DISTRICT", country: "Rwanda" },
        distinct: ["district"],
        select: { district: true },
        orderBy: { district: "asc" },
      }),

      prisma.propertyType.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, name: true, displayName: true, marketplaceId: true, sortOrder: true, marketplace: { select: { name: true } } },
        orderBy: { sortOrder: "asc" },
      }),

      prisma.property.findMany({
        where: { status: "ACTIVE" },
        select: LISTING_SELECT,
        orderBy: { viewCount: "desc" },
        take: 6,
      }),

      prisma.property.findMany({
        where: { status: "ACTIVE" },
        select: LISTING_SELECT,
        orderBy: { createdAt: "desc" },
        take: 6,
      }),

      prisma.property.count({ where: { status: "ACTIVE" } }),

      // One count query per tile, all issued in parallel. Counted directly
      // rather than by listing a page per tile so the payload stays tiny.
      ...POPULAR_TILES.map((tile) =>
        prisma.property.count({
          where: {
            status: "ACTIVE",
            marketplace: { name: "House Rental" },
            ...(tile.sector ? { locationSector: tile.sector } : { locationDistrict: tile.district }),
          },
        })
      ),
    ]);

    const popularCounts: Record<string, number> = {};
    POPULAR_TILES.forEach((tile, i) => {
      popularCounts[tile.label] = tileCounts[i] ?? 0;
    });

    return NextResponse.json(
      {
        districts: districts.map((d) => d.district).filter(Boolean),
        propertyTypes,
        featured,
        recent,
        totalActive,
        popularCounts,
        // Kept so the client does not need a second round trip to know the
        // marketplace id/name mapping it filters on.
        popularTiles: POPULAR_TILES,
      },
      {
        headers: {
          // Brief shared cache: new listings appear within 60s.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Home data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}