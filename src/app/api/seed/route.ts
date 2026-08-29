import { NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { hashPassword } from "@/lib/auth";

const MONGO_URI = process.env.DATABASE_URL!;

const COL = {
  user: "user",
  profile: "profile",
  marketplace: "marketplace",
  plan: "plan",
  membership: "membership",
  payment: "payment",
  property: "property",
  propertyType: "propertyType",
  propertyImage: "propertyImage",
  propertyKeyword: "propertyKeyword",
  notification: "notification",
  locationHierarchy: "locationHierarchy",
  report: "report",
};

export async function POST() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db("igura_marketplace");

    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.dropCollection(col.name);
    }

    const now = new Date();
    const adminId = new ObjectId();
    const agentId = new ObjectId();
    const clientId = new ObjectId();

    await db.collection(COL.user).insertMany([
      { _id: adminId, email: "admin@igura.rw", phone: "+250788000000", passwordHash: await hashPassword("Admin123!"), firstName: "Admin", lastName: "Igura", role: "ADMIN", emailVerified: true, phoneVerified: true, isActive: true, createdAt: now, updatedAt: now },
      { _id: agentId, email: "agent@igura.rw", phone: "+250788111111", passwordHash: await hashPassword("Agent123!"), firstName: "Jean", lastName: "Hakizimana", role: "COMMISSIONAIRE", emailVerified: true, phoneVerified: true, isActive: true, createdAt: now, updatedAt: now },
      { _id: clientId, email: "client@igura.rw", phone: "+250788222222", passwordHash: await hashPassword("Client123!"), firstName: "Marie", lastName: "Uwimana", role: "CLIENT", emailVerified: true, phoneVerified: true, isActive: true, createdAt: now, updatedAt: now },
    ]);

    await db.collection(COL.profile).insertMany([
      { _id: new ObjectId(), userId: adminId, avatarUrl: null, bio: "System Administrator", address: null, district: null, createdAt: now, updatedAt: now },
      { _id: new ObjectId(), userId: agentId, avatarUrl: null, bio: "Licensed real estate commissionaire", address: "Kigali, Rwanda", district: "Kigali City", createdAt: now, updatedAt: now },
      { _id: new ObjectId(), userId: clientId, avatarUrl: null, bio: "Looking for a house", address: null, district: "Kigali City", createdAt: now, updatedAt: now },
    ]);

    const rentalId = new ObjectId();
    const plotId = new ObjectId();
    await db.collection(COL.marketplace).insertMany([
      { _id: rentalId, name: "House Rental", slug: "house-rental", description: "Find houses and apartments for rent", status: "ACTIVE", createdAt: now, updatedAt: now },
      { _id: plotId, name: "Plot Selling VIP", slug: "plot-selling-vip", description: "Premium plots and land for sale", status: "ACTIVE", createdAt: now, updatedAt: now },
    ]);

    const proPlanId = new ObjectId();
    await db.collection(COL.plan).insertMany([
      { _id: new ObjectId(), name: "Free", slug: "free", price: 0, durationDays: 30, maxListings: 2, features: ["2 active listings", "Basic support"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now },
      { _id: new ObjectId(), name: "Basic", slug: "basic", price: 5000, durationDays: 30, maxListings: 5, features: ["5 listings", "Priority support"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now },
      { _id: proPlanId, name: "Professional", slug: "professional", price: 15000, durationDays: 30, maxListings: 10, features: ["10 listings", "Analytics"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now },
      { _id: new ObjectId(), name: "VIP", slug: "vip", price: 50000, durationDays: 30, maxListings: 50, features: ["50 listings", "Premium placement"], status: "ACTIVE", marketplaceId: plotId, createdAt: now, updatedAt: now },
    ]);

    await db.collection(COL.membership).insertOne({ _id: new ObjectId(), userId: agentId, planId: proPlanId, marketplaceId: rentalId, status: "ACTIVE", startDate: now, endDate: new Date(now.getTime() + 30 * 86400000), createdAt: now, updatedAt: now });

    await db.collection(COL.locationHierarchy).insertMany([
      { _id: "rwanda_country", country: "Rwanda", district: null, sector: null, cell: null, village: null, level: "COUNTRY", parentId: null },
      { _id: "kigali_city", country: "Rwanda", district: "Kigali City", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: null, village: null, level: "SECTOR", parentId: "kigali_city" },
      { _id: "kicukiro", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: null, village: null, level: "SECTOR", parentId: "kigali_city" },
      { _id: "nyarugenge", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: null, village: null, level: "SECTOR", parentId: "kigali_city" },
      { _id: "remera", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", village: null, level: "CELL", parentId: "gasabo" },
      { _id: "kimironko", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null, level: "CELL", parentId: "gasabo" },
      { _id: "kacyiru", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kacyiru", village: null, level: "CELL", parentId: "gasabo" },
      { _id: "kanombe", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Kanombe", village: null, level: "CELL", parentId: "kicukiro" },
      { _id: "gatenga", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Gatenga", village: null, level: "CELL", parentId: "kicukiro" },
      { _id: "nyabugogo", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Nyabugogo", village: null, level: "CELL", parentId: "nyarugenge" },
      { _id: "gitega", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", village: null, level: "CELL", parentId: "nyarugenge" },
      { _id: "huye", country: "Rwanda", district: "Huye", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "muhanga", country: "Rwanda", district: "Muhanga", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "rubavu", country: "Rwanda", district: "Rubavu", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "rusizi", country: "Rwanda", district: "Rusizi", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "musanze", country: "Rwanda", district: "Musanze", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "nyagatare", country: "Rwanda", district: "Nyagatare", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "kayonza", country: "Rwanda", district: "Kayonza", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
      { _id: "bugesera", country: "Rwanda", district: "Bugesera", sector: null, cell: null, village: null, level: "DISTRICT", parentId: "rwanda_country" },
    ] as any[]);

    const houseTypes = ["Villa", "Apartment", "Studio", "Townhouse", "Duplex", "Bungalow", "Room"];
    const plotTypeNames = ["Residential Plot", "Commercial Plot", "Agricultural Land", "Industrial Land"];
    const propertyTypes = [
      ...houseTypes.map((name, i) => ({ _id: new ObjectId(), marketplaceId: rentalId, name, slug: name.toLowerCase().replace(/\s+/g, "-"), displayName: name, sortOrder: i, status: "ACTIVE", createdAt: now })),
      ...plotTypeNames.map((name, i) => ({ _id: new ObjectId(), marketplaceId: plotId, name, slug: name.toLowerCase().replace(/\s+/g, "-"), displayName: name, sortOrder: i, status: "ACTIVE", createdAt: now })),
    ];
    await db.collection(COL.propertyType).insertMany(propertyTypes);

    const rTypes = propertyTypes.filter(t => t.marketplaceId.toString() === rentalId.toString());
    const pTypes = propertyTypes.filter(t => t.marketplaceId.toString() === plotId.toString());

    const sampleProps = [
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[0]._id, title: "Modern 3-Bedroom Villa in Kimironko", slug: "modern-3bedroom-villa-kimironko", description: "Beautiful modern villa with spacious rooms, fitted kitchen, and large garden.", price: 350000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2, area: 250, areaUnit: "sqm", address: "KG 7 Ave, Kimironko, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null, locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9403, longitude: 29.9616, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: true, views: 245 },
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[1]._id, title: "Luxury 2-Bedroom Apartment in Remera", slug: "luxury-2bedroom-apartment-remera", description: "Fully furnished luxury apartment with swimming pool and gym access.", price: 450000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 2, bathrooms: 2, area: 120, areaUnit: "sqm", address: "KN 5 Rd, Remera, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", village: null, locationName: "Remera, Gasabo, Kigali", latitude: -1.9536, longitude: 29.9236, showGps: false, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: true, views: 189 },
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[3]._id, title: "Cozy Townhouse near Kacyiru", slug: "cozy-townhouse-kacyiru", description: "Well-maintained townhouse close to international schools.", price: 500000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 4, bathrooms: 3, area: 300, areaUnit: "sqm", address: "KG 11 Ave, Kacyiru, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kacyiru", village: null, locationName: "Kacyiru, Gasabo, Kigali", latitude: -1.9476, longitude: 29.9386, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: false, views: 134 },
      { userId: clientId, marketplaceId: rentalId, propertyTypeId: rTypes[2]._id, title: "Affordable Studio in Nyabugogo", slug: "affordable-studio-nyabugogo", description: "Compact studio near Nyabugogo bus station.", price: 80000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 0, bathrooms: 1, area: 35, areaUnit: "sqm", address: "KN 3 Rd, Nyabugogo, Nyarugenge", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Nyabugogo", village: null, locationName: "Nyabugogo, Nyarugenge, Kigali", latitude: -1.9386, longitude: 29.9186, showGps: true, contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana", status: "ACTIVE", featured: false, views: 78 },
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[4]._id, title: "Spacious Duplex in Kanombe", slug: "spacious-duplex-kanombe", description: "Elegant duplex with panoramic city views.", price: 600000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 5, bathrooms: 4, area: 400, areaUnit: "sqm", address: "KG 20 Rd, Kanombe, Kicukiro", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Kanombe", village: null, locationName: "Kanombe, Kicukiro, Kigali", latitude: -1.9706, longitude: 29.9486, showGps: false, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: true, views: 312 },
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[5]._id, title: "Charming Bungalow in Gatenga", slug: "charming-bungalow-gatenga", description: "Single-story bungalow with a beautiful garden.", price: 250000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2, area: 180, areaUnit: "sqm", address: "KG 15 Rd, Gatenga, Kicukiro", country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Gatenga", village: null, locationName: "Gatenga, Kicukiro, Kigali", latitude: -1.9656, longitude: 29.9336, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: false, views: 167 },
      { userId: clientId, marketplaceId: rentalId, propertyTypeId: rTypes[6]._id, title: "Furnished Room in Gitega", slug: "furnished-room-gitega", description: "Clean furnished room with WiFi and electricity.", price: 40000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 1, bathrooms: 1, area: 20, areaUnit: "sqm", address: "KG 5 Rd, Gitega, Nyarugenge", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", village: null, locationName: "Gitega, Nyarugenge, Kigali", latitude: -1.9436, longitude: 29.9136, showGps: true, contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana", status: "ACTIVE", featured: false, views: 56 },
      { userId: agentId, marketplaceId: rentalId, propertyTypeId: rTypes[1]._id, title: "Family Apartment in Kimironko", slug: "family-apartment-kimironko", description: "Spacious 3-bedroom apartment near Kimironko market.", price: 300000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2, area: 150, areaUnit: "sqm", address: "KG 8 Rd, Kimironko, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null, locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9413, longitude: 29.9626, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: false, views: 198 },
    ].map(p => ({ ...p, _id: new ObjectId(), createdAt: now, updatedAt: now }));
    await db.collection(COL.property).insertMany(sampleProps);

    const samplePlots = [
      { userId: agentId, marketplaceId: plotId, propertyTypeId: pTypes[0]._id, title: "Prime Residential Plot in Kimironko", slug: "prime-residential-plot-kimironko", description: "1000 sqm residential plot in developing area.", price: 15000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null, area: 1000, areaUnit: "sqm", address: "KG 7 Ave, Kimironko, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null, locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9393, longitude: 29.9606, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: true, views: 456 },
      { userId: agentId, marketplaceId: plotId, propertyTypeId: pTypes[1]._id, title: "Commercial Plot on KN5 Road", slug: "commercial-plot-kn5-road", description: "Strategic commercial plot on main road.", price: 50000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null, area: 2000, areaUnit: "sqm", address: "KN 5 Rd, Remera, Gasabo", country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", village: null, locationName: "Remera, Gasabo, Kigali", latitude: -1.9546, longitude: 29.9246, showGps: false, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: true, views: 389 },
      { userId: clientId, marketplaceId: plotId, propertyTypeId: pTypes[0]._id, title: "Residential Plot in Gitega", slug: "residential-plot-gitega", description: "500 sqm plot in quiet residential area.", price: 8000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null, area: 500, areaUnit: "sqm", address: "KG 5 Rd, Gitega, Nyarugenge", country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", village: null, locationName: "Gitega, Nyarugenge, Kigali", latitude: -1.9446, longitude: 29.9146, showGps: true, contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana", status: "ACTIVE", featured: false, views: 123 },
      { userId: agentId, marketplaceId: plotId, propertyTypeId: pTypes[2]._id, title: "Agricultural Land in Bugesera", slug: "agricultural-land-bugesera", description: "5 hectares of fertile agricultural land.", price: 25000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null, area: 50000, areaUnit: "sqm", address: "Bugesera District", country: "Rwanda", district: "Bugesera", sector: null, cell: null, village: null, locationName: "Bugesera, Eastern Province", latitude: -2.2333, longitude: 29.9167, showGps: true, contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana", status: "ACTIVE", featured: false, views: 87 },
    ].map(p => ({ ...p, _id: new ObjectId(), createdAt: now, updatedAt: now }));
    await db.collection(COL.property).insertMany(samplePlots);

    const allProps = [...sampleProps, ...samplePlots];
    const images = [];
    for (const prop of allProps) {
      for (let i = 0; i < 3; i++) {
        images.push({ _id: new ObjectId(), propertyId: prop._id, url: `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format`, storagePath: null, sortOrder: i, altText: `${prop.title} - Image ${i + 1}`, createdAt: now });
      }
    }
    await db.collection(COL.propertyImage).insertMany(images);

    const keywords = [];
    for (const prop of allProps) {
      for (const word of prop.title.split(" ").filter((w: string) => w.length > 3).slice(0, 5)) {
        keywords.push({ _id: new ObjectId(), propertyId: prop._id, keyword: word.toLowerCase() });
      }
    }
    await db.collection(COL.propertyKeyword).insertMany(keywords);

    await db.collection(COL.notification).insertMany([
      { _id: new ObjectId(), userId: agentId, type: "WELCOME", title: "Welcome to Igura!", message: "Your account is ready. Start listing properties!", read: false, metadata: null, createdAt: now },
      { _id: new ObjectId(), userId: clientId, type: "WELCOME", title: "Welcome to Igura!", message: "Browse our listings to find your perfect home.", read: false, metadata: null, createdAt: now },
    ]);

    await db.collection(COL.user).createIndex({ email: 1 }, { unique: true });
    await db.collection(COL.user).createIndex({ phone: 1 }, { sparse: true });
    await db.collection(COL.profile).createIndex({ userId: 1 }, { unique: true });
    await db.collection(COL.property).createIndex({ marketplaceId: 1 });
    await db.collection(COL.property).createIndex({ userId: 1 });
    await db.collection(COL.property).createIndex({ status: 1 });
    await db.collection(COL.property).createIndex({ propertyTypeId: 1 });
    await db.collection(COL.property).createIndex({ district: 1 });
    await db.collection(COL.property).createIndex({ price: 1 });
    await db.collection(COL.property).createIndex({ createdAt: -1 });
    await db.collection(COL.property).createIndex({ slug: 1 }, { unique: true });
    await db.collection(COL.property).createIndex({ title: "text", description: "text" });
    await db.collection(COL.propertyImage).createIndex({ propertyId: 1 });
    await db.collection(COL.propertyKeyword).createIndex({ propertyId: 1 });
    await db.collection(COL.propertyKeyword).createIndex({ keyword: 1 });
    await db.collection(COL.propertyType).createIndex({ marketplaceId: 1 });
    await db.collection(COL.notification).createIndex({ userId: 1 });

    await client.close();

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
      accounts: {
        admin: "admin@igura.rw / Admin123!",
        commissionaire: "agent@igura.rw / Agent123!",
        client: "client@igura.rw / Client123!",
      },
    });
  } catch (error: any) {
    await client.close();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
