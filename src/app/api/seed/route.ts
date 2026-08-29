import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    await prisma.notification.deleteMany();
    await prisma.propertyKeyword.deleteMany();
    await prisma.propertyImage.deleteMany();
    await prisma.propertyFeature.deleteMany();
    await prisma.property.deleteMany();
    await prisma.propertyType.deleteMany();
    await prisma.paymentEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.plan.deleteMany();
    await prisma.marketplace.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.adminAction.deleteMany();
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.locationHierarchy.deleteMany();

    const admin = await prisma.user.create({ data: { email: "admin@igura.rw", phone: "+250788000000", passwordHash: await hashPassword("Admin123!"), firstName: "Admin", lastName: "Igura", role: "ADMIN", emailVerified: true, phoneVerified: true, isActive: true } });
    const agent = await prisma.user.create({ data: { email: "agent@igura.rw", phone: "+250788111111", passwordHash: await hashPassword("Agent123!"), firstName: "Jean", lastName: "Hakizimana", role: "COMMISSIONAIRE", emailVerified: true, phoneVerified: true, isActive: true } });
    const client = await prisma.user.create({ data: { email: "client@igura.rw", phone: "+250788222222", passwordHash: await hashPassword("Client123!"), firstName: "Marie", lastName: "Uwimana", role: "CLIENT", emailVerified: true, phoneVerified: true, isActive: true } });

    await prisma.profile.create({ data: { userId: admin.id, bio: "System Administrator" } });
    await prisma.profile.create({ data: { userId: agent.id, bio: "Licensed real estate commissionaire", address: "Kigali, Rwanda", district: "Kigali City" } });
    await prisma.profile.create({ data: { userId: client.id, bio: "Looking for a house", district: "Kigali City" } });

    const rental = await prisma.marketplace.create({ data: { name: "House Rental", displayName: "House Rental", description: "Find houses and apartments for rent", status: "ACTIVE" } });
    const plot = await prisma.marketplace.create({ data: { name: "Plot Selling VIP", displayName: "Plot Selling VIP", description: "Premium plots and land for sale", status: "ACTIVE" } });

    const freePlan = await prisma.plan.create({ data: { name: "Free", displayName: "Free", marketplaceId: rental.id, role: "COMMISSIONAIRE", price: 0, maxActiveListings: 2, maxImagesPerListing: 3, features: ["2 active listings", "Basic support"], status: "ACTIVE" } });
    const basicPlan = await prisma.plan.create({ data: { name: "Basic", displayName: "Basic", marketplaceId: rental.id, role: "COMMISSIONAIRE", price: 5000, maxActiveListings: 5, maxImagesPerListing: 3, features: ["5 listings", "Priority support"], status: "ACTIVE" } });
    const proPlan = await prisma.plan.create({ data: { name: "Professional", displayName: "Professional", marketplaceId: rental.id, role: "COMMISSIONAIRE", price: 15000, maxActiveListings: 10, maxImagesPerListing: 3, features: ["10 listings", "Analytics"], status: "ACTIVE" } });
    const vipPlan = await prisma.plan.create({ data: { name: "VIP", displayName: "VIP", marketplaceId: plot.id, role: "COMMISSIONAIRE", price: 50000, maxActiveListings: 50, maxImagesPerListing: 3, features: ["50 listings", "Premium placement"], status: "ACTIVE" } });

    const now = new Date();
    await prisma.membership.create({ data: { userId: agent.id, planId: proPlan.id, status: "ACTIVE", activatedAt: now, expiresAt: new Date(now.getTime() + 30 * 86400000) } });

    const locs = [
      { id: "rwanda_country", country: "Rwanda", level: "COUNTRY" },
      { id: "kigali_city", country: "Rwanda", district: "Kigali City", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", level: "SECTOR", parentId: "kigali_city" },
      { id: "kicukiro", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", level: "SECTOR", parentId: "kigali_city" },
      { id: "nyarugenge", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", level: "SECTOR", parentId: "kigali_city" },
      { id: "remera", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", level: "CELL", parentId: "gasabo" },
      { id: "kimironko", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", level: "CELL", parentId: "gasabo" },
      { id: "kacyiru", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kacyiru", level: "CELL", parentId: "gasabo" },
      { id: "kanombe", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Kanombe", level: "CELL", parentId: "kicukiro" },
      { id: "gatenga", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Gatenga", level: "CELL", parentId: "kicukiro" },
      { id: "nyabugogo", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Nyabugogo", level: "CELL", parentId: "nyarugenge" },
      { id: "gitega", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", level: "CELL", parentId: "nyarugenge" },
      { id: "huye", country: "Rwanda", district: "Huye", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "muhanga", country: "Rwanda", district: "Muhanga", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "rubavu", country: "Rwanda", district: "Rubavu", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "rusizi", country: "Rwanda", district: "Rusizi", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "musanze", country: "Rwanda", district: "Musanze", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "nyagatare", country: "Rwanda", district: "Nyagatare", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "kayonza", country: "Rwanda", district: "Kayonza", level: "DISTRICT", parentId: "rwanda_country" },
      { id: "bugesera", country: "Rwanda", district: "Bugesera", level: "DISTRICT", parentId: "rwanda_country" },
    ];
    for (const l of locs) {
      await prisma.locationHierarchy.create({ data: l as any });
    }

    const houseTypeNames = ["Villa", "Apartment", "Studio", "Townhouse", "Duplex", "Bungalow", "Room"];
    const plotTypeNames = ["Residential Plot", "Commercial Plot", "Agricultural Land", "Industrial Land"];
    const rentalTypes = [];
    for (let i = 0; i < houseTypeNames.length; i++) {
      const t = await prisma.propertyType.create({ data: { marketplaceId: rental.id, name: houseTypeNames[i], slug: houseTypeNames[i].toLowerCase().replace(/\s+/g, "-"), displayName: houseTypeNames[i], sortOrder: i, status: "ACTIVE" } });
      rentalTypes.push(t);
    }
    const plotTypes = [];
    for (let i = 0; i < plotTypeNames.length; i++) {
      const t = await prisma.propertyType.create({ data: { marketplaceId: plot.id, name: plotTypeNames[i], slug: plotTypeNames[i].toLowerCase().replace(/\s+/g, "-"), displayName: plotTypeNames[i], sortOrder: i, status: "ACTIVE" } });
      plotTypes.push(t);
    }

    const rentalPropsData = [
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[0].id, title: "Modern 3-Bedroom Villa in Kimironko", slug: "modern-3bedroom-villa-kimironko", description: "Beautiful modern villa with spacious rooms, fitted kitchen, and large garden.", price: 350000, bedrooms: 3, bathrooms: 2, areaValue: 250, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9403, longitude: 29.9616, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 245 },
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[1].id, title: "Luxury 2-Bedroom Apartment in Remera", slug: "luxury-2bedroom-apartment-remera", description: "Fully furnished luxury apartment with swimming pool and gym access.", price: 450000, bedrooms: 2, bathrooms: 2, areaValue: 120, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Remera", latitude: -1.9536, longitude: 29.9236, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 189 },
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[3].id, title: "Cozy Townhouse near Kacyiru", slug: "cozy-townhouse-kacyiru", description: "Well-maintained townhouse close to international schools.", price: 500000, bedrooms: 4, bathrooms: 3, areaValue: 300, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kacyiru", latitude: -1.9476, longitude: 29.9386, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 134 },
      { ownerId: client.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[2].id, title: "Affordable Studio in Nyabugogo", slug: "affordable-studio-nyabugogo", description: "Compact studio near Nyabugogo bus station.", price: 80000, bedrooms: 0, bathrooms: 1, areaValue: 35, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Nyarugenge", locationCell: "Nyabugogo", latitude: -1.9386, longitude: 29.9186, contactPhone: "+250788222222", contactName: "Marie Uwimana", status: "ACTIVE", viewCount: 78 },
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[4].id, title: "Spacious Duplex in Kanombe", slug: "spacious-duplex-kanombe", description: "Elegant duplex with panoramic city views.", price: 600000, bedrooms: 5, bathrooms: 4, areaValue: 400, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Kicukiro", locationCell: "Kanombe", latitude: -1.9706, longitude: 29.9486, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 312 },
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[5].id, title: "Charming Bungalow in Gatenga", slug: "charming-bungalow-gatenga", description: "Single-story bungalow with a beautiful garden.", price: 250000, bedrooms: 3, bathrooms: 2, areaValue: 180, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Kicukiro", locationCell: "Gatenga", latitude: -1.9656, longitude: 29.9336, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 167 },
      { ownerId: client.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[6].id, title: "Furnished Room in Gitega", slug: "furnished-room-gitega", description: "Clean furnished room with WiFi and electricity.", price: 40000, bedrooms: 1, bathrooms: 1, areaValue: 20, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Nyarugenge", locationCell: "Gitega", latitude: -1.9436, longitude: 29.9136, contactPhone: "+250788222222", contactName: "Marie Uwimana", status: "ACTIVE", viewCount: 56 },
      { ownerId: agent.id, marketplaceId: rental.id, propertyTypeId: rentalTypes[1].id, title: "Family Apartment in Kimironko", slug: "family-apartment-kimironko", description: "Spacious 3-bedroom apartment near Kimironko market.", price: 300000, bedrooms: 3, bathrooms: 2, areaValue: 150, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9413, longitude: 29.9626, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 198 },
    ];

    const rentalProps = [];
    for (const p of rentalPropsData) {
      const prop = await prisma.property.create({ data: p as any });
      rentalProps.push(prop);
    }

    const plotPropsData = [
      { ownerId: agent.id, marketplaceId: plot.id, propertyTypeId: plotTypes[0].id, title: "Prime Residential Plot in Kimironko", slug: "prime-residential-plot-kimironko", description: "1000 sqm residential plot in developing area.", price: 15000000, areaValue: 1000, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Kimironko", latitude: -1.9393, longitude: 29.9606, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 456 },
      { ownerId: agent.id, marketplaceId: plot.id, propertyTypeId: plotTypes[1].id, title: "Commercial Plot on KN5 Road", slug: "commercial-plot-kn5-road", description: "Strategic commercial plot on main road.", price: 50000000, areaValue: 2000, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Gasabo", locationCell: "Remera", latitude: -1.9546, longitude: 29.9246, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 389 },
      { ownerId: client.id, marketplaceId: plot.id, propertyTypeId: plotTypes[0].id, title: "Residential Plot in Gitega", slug: "residential-plot-gitega", description: "500 sqm plot in quiet residential area.", price: 8000000, areaValue: 500, areaUnit: "SQM", locationDistrict: "Kigali City", locationSector: "Nyarugenge", locationCell: "Gitega", latitude: -1.9446, longitude: 29.9146, contactPhone: "+250788222222", contactName: "Marie Uwimana", status: "ACTIVE", viewCount: 123 },
      { ownerId: agent.id, marketplaceId: plot.id, propertyTypeId: plotTypes[2].id, title: "Agricultural Land in Bugesera", slug: "agricultural-land-bugesera", description: "5 hectares of fertile agricultural land.", price: 25000000, areaValue: 50000, areaUnit: "SQM", locationDistrict: "Bugesera", latitude: -2.2333, longitude: 29.9167, contactPhone: "+250788111111", contactName: "Jean Hakizimana", status: "ACTIVE", viewCount: 87 },
    ];

    const plotProps = [];
    for (const p of plotPropsData) {
      const prop = await prisma.property.create({ data: p as any });
      plotProps.push(prop);
    }

    const allProps = [...rentalProps, ...plotProps];
    for (const prop of allProps) {
      for (let i = 0; i < 3; i++) {
        await prisma.propertyImage.create({ data: { propertyId: prop.id, url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format", sortOrder: i, altText: `${prop.title} - Image ${i + 1}` } });
      }
    }

    for (const prop of allProps) {
      const words = prop.title.split(" ").filter((w: string) => w.length > 3).slice(0, 5);
      for (const word of words) {
        await prisma.propertyKeyword.create({ data: { propertyId: prop.id, keyword: word.toLowerCase() } });
      }
    }

    await prisma.notification.create({ data: { userId: agent.id, type: "WELCOME", title: "Welcome to Igura!", message: "Your account is ready. Start listing properties!" } });
    await prisma.notification.create({ data: { userId: client.id, type: "WELCOME", title: "Welcome to Igura!", message: "Browse our listings to find your perfect home." } });

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully via Prisma!",
      accounts: {
        admin: "admin@igura.rw / Admin123!",
        commissionaire: "agent@igura.rw / Agent123!",
        client: "client@igura.rw / Client123!",
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
