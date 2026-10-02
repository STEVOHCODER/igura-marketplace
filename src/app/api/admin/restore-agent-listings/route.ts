import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { buildSearchText } from "@/lib/utils";

/**
 * Restores the commissionaire (agent) account's seed listings.
 *
 * The 13 agent-owned listings were lost to owner-side deletes (trash taps).
 * This recreates them exactly from the seed definition — titles, slugs,
 * prices, locations, images and keywords — WITHOUT the destructive
 * deleteMany calls the full seed route makes, so live users, payments and
 * memberships are never touched. Idempotent: if the agent already owns
 * listings, it does nothing.
 */
export async function POST() {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const agent = await prisma.user.findUnique({ where: { email: "agent@igura.rw" } });
    if (!agent) {
      return NextResponse.json({ error: "Agent account not found" }, { status: 404 });
    }

    const existing = await prisma.property.count({ where: { ownerId: agent.id } });
    if (existing > 0) {
      return NextResponse.json({ skipped: true, reason: `Agent already owns ${existing} listings` });
    }

    const rental = await prisma.marketplace.findFirst({ where: { name: "House Rental" } });
    const plot = await prisma.marketplace.findFirst({ where: { name: "Plot Selling VIP" } });
    const houseSelling = await prisma.marketplace.findFirst({ where: { name: "House Selling VVIP" } });
    if (!rental || !plot || !houseSelling) {
      return NextResponse.json({ error: "Marketplaces not found" }, { status: 404 });
    }

    const rentalTypes = await prisma.propertyType.findMany({
      where: { marketplaceId: rental.id },
      orderBy: { sortOrder: "asc" },
    });
    const plotTypes = await prisma.propertyType.findMany({
      where: { marketplaceId: plot.id },
      orderBy: { sortOrder: "asc" },
    });
    const houseSellingTypes = await prisma.propertyType.findMany({
      where: { marketplaceId: houseSelling.id },
      orderBy: { sortOrder: "asc" },
    });

    const rentalData = [
      { propertyTypeId: rentalTypes[0].id, title: "Modern 3-Bedroom Villa in Kimironko", slug: "modern-3bedroom-villa-kimironko", description: "Beautiful modern villa with spacious rooms, fitted kitchen, and large garden.", price: 350000, bedrooms: 3, bathrooms: 2, areaValue: 250, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9403, longitude: 29.9616, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 245 },
      { propertyTypeId: rentalTypes[1].id, title: "Luxury 2-Bedroom Apartment in Remera", slug: "luxury-2bedroom-apartment-remera", description: "Fully furnished luxury apartment with swimming pool and gym access.", price: 450000, bedrooms: 2, bathrooms: 2, areaValue: 120, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Remera", latitude: -1.9536, longitude: 29.9236, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 189 },
      { propertyTypeId: rentalTypes[3].id, title: "Cozy Townhouse near Kacyiru", slug: "cozy-townhouse-kacyiru", description: "Well-maintained townhouse close to international schools.", price: 500000, bedrooms: 4, bathrooms: 3, areaValue: 300, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kacyiru", latitude: -1.9476, longitude: 29.9386, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 134 },
      { propertyTypeId: rentalTypes[4].id, title: "Spacious Duplex in Kanombe", slug: "spacious-duplex-kanombe", description: "Elegant duplex with panoramic city views.", price: 600000, bedrooms: 5, bathrooms: 4, areaValue: 400, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Kicukiro", locationCell: "Kanombe", latitude: -1.9706, longitude: 29.9486, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 312 },
      { propertyTypeId: rentalTypes[5].id, title: "Charming Bungalow in Gatenga", slug: "charming-bungalow-gatenga", description: "Single-story bungalow with a beautiful garden.", price: 250000, bedrooms: 3, bathrooms: 2, areaValue: 180, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Kicukiro", locationCell: "Gatenga", latitude: -1.9656, longitude: 29.9336, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 167 },
      { propertyTypeId: rentalTypes[1].id, title: "Family Apartment in Kimironko", slug: "family-apartment-kimironko", description: "Spacious 3-bedroom apartment near Kimironko market.", price: 300000, bedrooms: 3, bathrooms: 2, areaValue: 150, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9413, longitude: 29.9626, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 198 },
    ];

    const plotData = [
      { propertyTypeId: plotTypes[0].id, title: "Prime Residential Plot in Kimironko", slug: "prime-residential-plot-kimironko", description: "1000 sqm residential plot in developing area.", price: 15000000, areaValue: 1000, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9393, longitude: 29.9606, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 456, bedrooms: undefined, bathrooms: undefined },
      { propertyTypeId: plotTypes[1].id, title: "Commercial Plot on KN5 Road", slug: "commercial-plot-kn5-road", description: "Strategic commercial plot on main road.", price: 50000000, areaValue: 2000, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Remera", latitude: -1.9546, longitude: 29.9246, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 389, bedrooms: undefined, bathrooms: undefined },
      { propertyTypeId: plotTypes[2].id, title: "Agricultural Land in Bugesera", slug: "agricultural-land-bugesera", description: "5 hectares of fertile agricultural land.", price: 25000000, areaValue: 50000, areaUnit: "SQM", locationDistrict: "Bugesera", latitude: -2.2333, longitude: 29.9167, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 87, bedrooms: undefined, bathrooms: undefined },
    ];

    const houseSellingData = [
      { propertyTypeId: houseSellingTypes[0].id, title: "Luxury 5-Bedroom Villa in Nyarutarama", slug: "luxury-5bedroom-villa-nyarutarama", description: "Exquisite luxury villa with modern amenities, private pool, and stunning views of Kigali hills.", price: 250000000, bedrooms: 5, bathrooms: 4, areaValue: 500, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Nyarutarama", latitude: -1.9350, longitude: 29.9500, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 567 },
      { propertyTypeId: houseSellingTypes[1].id, title: "Modern 3-Bedroom Apartment in Kimihurura", slug: "modern-3bedroom-apartment-kimihurura", description: "Sleek modern apartment in diplomatic zone with smart home features.", price: 120000000, bedrooms: 3, bathrooms: 3, areaValue: 200, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimihurura", latitude: -1.9480, longitude: 29.9350, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 423 },
      { propertyTypeId: houseSellingTypes[3].id, title: "Premium Duplex in Kibagabaga", slug: "premium-duplex-kibagabaga", description: "Stunning duplex with panoramic city views and premium finishes.", price: 150000000, bedrooms: 4, bathrooms: 3, areaValue: 380, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kibagabaga", latitude: -1.9380, longitude: 29.9620, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 289 },
      { propertyTypeId: houseSellingTypes[4].id, title: "Family Bungalow in Kabuga", slug: "family-bungalow-kabuga", description: "Spacious single-story home with large compound, perfect for families.", price: 65000000, bedrooms: 4, bathrooms: 2, areaValue: 300, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kabuga", latitude: -1.9460, longitude: 29.9580, contactPhone: "+250788111111", contactName: "Jean Hakizimana", viewCount: 198 },
    ];

    const all = [
      ...rentalData.map((p) => ({ ...p, marketplaceId: rental.id })),
      ...plotData.map((p) => ({ ...p, marketplaceId: plot.id })),
      ...houseSellingData.map((p) => ({ ...p, marketplaceId: houseSelling.id })),
    ];

    const created: any[] = [];
    for (const p of all) {
      const prop = await prisma.property.create({
        data: {
          ownerId: agent.id,
          marketplaceId: p.marketplaceId,
          propertyTypeId: p.propertyTypeId,
          title: p.title,
          slug: p.slug,
          description: p.description,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          areaValue: p.areaValue,
          areaUnit: p.areaUnit,
          locationDistrict: p.locationDistrict,
          locationSector: p.locationSector,
          locationCell: p.locationCell,
          latitude: p.latitude,
          longitude: p.longitude,
          contactPhone: p.contactPhone,
          contactName: p.contactName,
          status: "ACTIVE",
          viewCount: p.viewCount,
          contactRevealed: false,
          searchText: buildSearchText({
            title: p.title,
            description: p.description,
            district: p.locationDistrict,
            sector: p.locationSector,
            cell: p.locationCell,
          }),
        },
      });
      created.push(prop);
    }

    for (const prop of created) {
      for (let i = 0; i < 3; i++) {
        await prisma.propertyImage.create({
          data: {
            propertyId: prop.id,
            url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format",
            sortOrder: i,
            altText: `${prop.title} - Image ${i + 1}`,
          },
        });
      }
      const words = prop.title.split(" ").filter((w: string) => w.length > 3).slice(0, 5);
      for (const word of words) {
        await prisma.propertyKeyword.create({ data: { propertyId: prop.id, keyword: word.toLowerCase() } });
      }
    }

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "AGENT_LISTINGS_RESTORED",
        targetType: "PROPERTY",
        targetId: "bulk",
        details: { restored: created.length },
      },
    });

    return NextResponse.json({ success: true, restored: created.length });
  } catch (error) {
    console.error("Restore agent listings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
