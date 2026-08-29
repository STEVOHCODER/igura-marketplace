import { MongoClient, ObjectId } from "mongodb";
import { createHash } from "crypto";

const MONGO_URI = "mongodb+srv://mayintake351_db_user:BDipZRGCBGT4yrl0@cluster0.wuajow8.mongodb.net/igura_marketplace?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "igura_marketplace";

async function setup() {
  console.log("Connecting to MongoDB Atlas...");

  // Try with explicit DNS options
  const client = new MongoClient(MONGO_URI, {
    dns: {
      resolvers: {
        select: (records) => records[0],
      },
    },
  });

  try {
    await client.connect();
    console.log("Connected successfully!");

    const db = client.db(DB_NAME);

    // Drop existing collections
    const collections = await db.listCollections().toArray();
    for (const col of collections) {
      await db.dropCollection(col.name);
      console.log(`Dropped: ${col.name}`);
    }

    // ========== USERS ==========
    const now = new Date();
    const hashPw = (pw) => createHash("sha256").update(pw).digest("hex");

    const adminId = new ObjectId();
    const agentId = new ObjectId();
    const clientId = new ObjectId();

    await db.collection("users").insertMany([
      {
        _id: adminId,
        email: "admin@igura.rw",
        phone: "+250788000000",
        passwordHash: hashPw("Admin123!"),
        role: "ADMIN",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: agentId,
        email: "agent@igura.rw",
        phone: "+250788111111",
        passwordHash: hashPw("Agent123!"),
        role: "COMMISSIONAIRE",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: clientId,
        email: "client@igura.rw",
        phone: "+250788222222",
        passwordHash: hashPw("Client123!"),
        role: "CLIENT",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    console.log("✓ Users created");

    // ========== PROFILES ==========
    await db.collection("profiles").insertMany([
      {
        _id: new ObjectId(), userId: adminId, firstName: "Admin", lastName: "Igura",
        bio: "System Administrator", avatarUrl: null, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, firstName: "Jean", lastName: "Hakizimana",
        bio: "Licensed real estate commissionaire in Kigali", avatarUrl: null, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: clientId, firstName: "Marie", lastName: "Uwimana",
        bio: "Looking for a house to rent in Kigali", avatarUrl: null, createdAt: now, updatedAt: now,
      },
    ]);
    console.log("✓ Profiles created");

    // ========== MARKETPLACES ==========
    const rentalId = new ObjectId();
    const plotId = new ObjectId();

    await db.collection("marketplaces").insertMany([
      {
        _id: rentalId, name: "House Rental", slug: "house-rental",
        description: "Find houses and apartments for rent across Rwanda",
        status: "ACTIVE", createdAt: now, updatedAt: now,
      },
      {
        _id: plotId, name: "Plot Selling VIP", slug: "plot-selling-vip",
        description: "Premium plots and land for sale in Rwanda",
        status: "ACTIVE", createdAt: now, updatedAt: now,
      },
    ]);
    console.log("✓ Marketplaces created");

    // ========== PLANS ==========
    const freePlanId = new ObjectId();
    const basicPlanId = new ObjectId();
    const proPlanId = new ObjectId();
    const vipPlanId = new ObjectId();

    await db.collection("plans").insertMany([
      {
        _id: freePlanId, name: "Free", slug: "free", price: 0, durationDays: 30, maxListings: 2,
        features: ["2 active listings", "Basic support"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now,
      },
      {
        _id: basicPlanId, name: "Basic", slug: "basic", price: 5000, durationDays: 30, maxListings: 5,
        features: ["5 active listings", "Priority support", "Featured badge"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now,
      },
      {
        _id: proPlanId, name: "Professional", slug: "professional", price: 15000, durationDays: 30, maxListings: 10,
        features: ["10 active listings", "Priority support", "Featured badge", "Analytics dashboard"], status: "ACTIVE", marketplaceId: rentalId, createdAt: now, updatedAt: now,
      },
      {
        _id: vipPlanId, name: "VIP", slug: "vip", price: 50000, durationDays: 30, maxListings: 50,
        features: ["50 active listings", "Dedicated support", "Featured badge", "Analytics dashboard", "Premium placement"], status: "ACTIVE", marketplaceId: plotId, createdAt: now, updatedAt: now,
      },
    ]);
    console.log("✓ Plans created");

    // ========== MEMBERSHIPS ==========
    await db.collection("memberships").insertOne({
      _id: new ObjectId(), userId: agentId, planId: proPlanId, marketplaceId: rentalId,
      status: "ACTIVE", startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now, updatedAt: now,
    });
    console.log("✓ Membership created");

    // ========== LOCATIONS ==========
    const locations = [
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
    ];
    await db.collection("location_hierarchies").insertMany(locations);
    console.log("✓ Locations created");

    // ========== PROPERTY TYPES ==========
    const houseTypes = ["Villa", "Apartment", "Studio", "Townhouse", "Duplex", "Bungalow", "Room"];
    const plotTypes = ["Residential Plot", "Commercial Plot", "Agricultural Land", "Industrial Land"];

    const propertyTypes = [
      ...houseTypes.map((name) => ({
        _id: new ObjectId(), marketplaceId: rentalId, name,
        slug: name.toLowerCase().replace(/\s+/g, "-"), displayName: name,
        sortOrder: houseTypes.indexOf(name), status: "ACTIVE", createdAt: now,
      })),
      ...plotTypes.map((name) => ({
        _id: new ObjectId(), marketplaceId: plotId, name,
        slug: name.toLowerCase().replace(/\s+/g, "-"), displayName: name,
        sortOrder: plotTypes.indexOf(name), status: "ACTIVE", createdAt: now,
      })),
    ];
    await db.collection("property_types").insertMany(propertyTypes);
    console.log("✓ Property types created");

    // ========== SAMPLE PROPERTIES ==========
    const rentalTypes = propertyTypes.filter((t) => t.marketplaceId.toString() === rentalId.toString());
    const plotTypeIds = propertyTypes.filter((t) => t.marketplaceId.toString() === plotId.toString());

    const sampleProperties = [
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[0]._id,
        title: "Modern 3-Bedroom Villa in Kimironko", slug: "modern-3bedroom-villa-kimironko",
        description: "Beautiful modern villa with spacious rooms, fitted kitchen, and large garden.",
        price: 350000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2,
        area: 250, areaUnit: "sqm", address: "KG 7 Ave, Kimironko, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null,
        locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9403, longitude: 29.9616, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: true, views: 245, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[1]._id,
        title: "Luxury 2-Bedroom Apartment in Remera", slug: "luxury-2bedroom-apartment-remera",
        description: "Fully furnished luxury apartment with modern amenities. Includes swimming pool access and gym.",
        price: 450000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 2, bathrooms: 2,
        area: 120, areaUnit: "sqm", address: "KN 5 Rd, Remera, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", village: null,
        locationName: "Remera, Gasabo, Kigali", latitude: -1.9536, longitude: 29.9236, showGps: false,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: true, views: 189, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[3]._id,
        title: "Cozy Townhouse near Kacyiru", slug: "cozy-townhouse-kacyiru",
        description: "Well-maintained townhouse in a secure compound. Close to international schools.",
        price: 500000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 4, bathrooms: 3,
        area: 300, areaUnit: "sqm", address: "KG 11 Ave, Kacyiru, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kacyiru", village: null,
        locationName: "Kacyiru, Gasabo, Kigali", latitude: -1.9476, longitude: 29.9386, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: false, views: 134, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: clientId, marketplaceId: rentalId, propertyTypeId: rentalTypes[2]._id,
        title: "Affordable Studio in Nyabugogo", slug: "affordable-studio-nyabugogo",
        description: "Compact and affordable studio apartment perfect for students or young professionals.",
        price: 80000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 0, bathrooms: 1,
        area: 35, areaUnit: "sqm", address: "KN 3 Rd, Nyabugogo, Nyarugenge",
        country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Nyabugogo", village: null,
        locationName: "Nyabugogo, Nyarugenge, Kigali", latitude: -1.9386, longitude: 29.9186, showGps: true,
        contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana",
        status: "ACTIVE", featured: false, views: 78, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[4]._id,
        title: "Spacious Duplex in Kanombe", slug: "spacious-duplex-kanombe",
        description: "Elegant duplex with panoramic city views. Features modern kitchen and private parking.",
        price: 600000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 5, bathrooms: 4,
        area: 400, areaUnit: "sqm", address: "KG 20 Rd, Kanombe, Kicukiro",
        country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Kanombe", village: null,
        locationName: "Kanombe, Kicukiro, Kigali", latitude: -1.9706, longitude: 29.9486, showGps: false,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: true, views: 312, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[5]._id,
        title: "Charming Bungalow in Gatenga", slug: "charming-bungalow-gatenga",
        description: "Single-story bungalow with a beautiful garden. Perfect for families.",
        price: 250000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2,
        area: 180, areaUnit: "sqm", address: "KG 15 Rd, Gatenga, Kicukiro",
        country: "Rwanda", district: "Kigali City", sector: "Kicukiro", cell: "Gatenga", village: null,
        locationName: "Gatenga, Kicukiro, Kigali", latitude: -1.9656, longitude: 29.9336, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: false, views: 167, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: clientId, marketplaceId: rentalId, propertyTypeId: rentalTypes[6]._id,
        title: "Furnished Room in Gitega", slug: "furnished-room-gitega",
        description: "Clean furnished room with shared bathroom. Includes WiFi and electricity.",
        price: 40000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 1, bathrooms: 1,
        area: 20, areaUnit: "sqm", address: "KG 5 Rd, Gitega, Nyarugenge",
        country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", village: null,
        locationName: "Gitega, Nyarugenge, Kigali", latitude: -1.9436, longitude: 29.9136, showGps: true,
        contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana",
        status: "ACTIVE", featured: false, views: 56, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: rentalId, propertyTypeId: rentalTypes[1]._id,
        title: "Family Apartment in Kimironko", slug: "family-apartment-kimironko",
        description: "Spacious family apartment with 3 bedrooms. Close to Kimironko market.",
        price: 300000, currency: "RWF", pricePeriod: "MONTHLY", bedrooms: 3, bathrooms: 2,
        area: 150, areaUnit: "sqm", address: "KG 8 Rd, Kimironko, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null,
        locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9413, longitude: 29.9626, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: false, views: 198, createdAt: now, updatedAt: now,
      },
    ];
    await db.collection("properties").insertMany(sampleProperties);
    console.log("✓ Rental properties created");

    // ========== SAMPLE PLOTS ==========
    const samplePlots = [
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: plotId, propertyTypeId: plotTypeIds[0]._id,
        title: "Prime Residential Plot in Kimironko", slug: "prime-residential-plot-kimironko",
        description: "1000 sqm residential plot in a developing area. All utilities available.",
        price: 15000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null,
        area: 1000, areaUnit: "sqm", address: "KG 7 Ave, Kimironko, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Kimironko", village: null,
        locationName: "Kimironko, Gasabo, Kigali", latitude: -1.9393, longitude: 29.9606, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: true, views: 456, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: plotId, propertyTypeId: plotTypeIds[1]._id,
        title: "Commercial Plot on KN5 Road", slug: "commercial-plot-kn5-road",
        description: "Strategic commercial plot on main road. Perfect for business center.",
        price: 50000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null,
        area: 2000, areaUnit: "sqm", address: "KN 5 Rd, Remera, Gasabo",
        country: "Rwanda", district: "Kigali City", sector: "Gasabo", cell: "Remera", village: null,
        locationName: "Remera, Gasabo, Kigali", latitude: -1.9546, longitude: 29.9246, showGps: false,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: true, views: 389, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: clientId, marketplaceId: plotId, propertyTypeId: plotTypeIds[0]._id,
        title: "Residential Plot in Gitega", slug: "residential-plot-gitega",
        description: "500 sqm plot in quiet residential area. Close to schools and shops.",
        price: 8000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null,
        area: 500, areaUnit: "sqm", address: "KG 5 Rd, Gitega, Nyarugenge",
        country: "Rwanda", district: "Kigali City", sector: "Nyarugenge", cell: "Gitega", village: null,
        locationName: "Gitega, Nyarugenge, Kigali", latitude: -1.9446, longitude: 29.9146, showGps: true,
        contactPhone: "+250788222222", contactEmail: "client@igura.rw", contactName: "Marie Uwimana",
        status: "ACTIVE", featured: false, views: 123, createdAt: now, updatedAt: now,
      },
      {
        _id: new ObjectId(), userId: agentId, marketplaceId: plotId, propertyTypeId: plotTypeIds[2]._id,
        title: "Agricultural Land in Bugesera", slug: "agricultural-land-bugesera",
        description: "5 hectares of fertile agricultural land. Water access available.",
        price: 25000000, currency: "RWF", pricePeriod: null, bedrooms: null, bathrooms: null,
        area: 50000, areaUnit: "sqm", address: "Bugesera District, Eastern Province",
        country: "Rwanda", district: "Bugesera", sector: null, cell: null, village: null,
        locationName: "Bugesera, Eastern Province", latitude: -2.2333, longitude: 29.9167, showGps: true,
        contactPhone: "+250788111111", contactEmail: "agent@igura.rw", contactName: "Jean Hakizimana",
        status: "ACTIVE", featured: false, views: 87, createdAt: now, updatedAt: now,
      },
    ];
    await db.collection("properties").insertMany(samplePlots);
    console.log("✓ Plot properties created");

    // ========== PROPERTY IMAGES ==========
    const images = [];
    for (const prop of [...sampleProperties, ...samplePlots]) {
      for (let i = 0; i < 3; i++) {
        images.push({
          _id: new ObjectId(), propertyId: prop._id,
          url: `https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&auto=format`,
          storagePath: null, sortOrder: i,
          altText: `${prop.title} - Image ${i + 1}`, createdAt: now,
        });
      }
    }
    await db.collection("property_images").insertMany(images);
    console.log("✓ Property images created");

    // ========== PROPERTY KEYWORDS ==========
    const keywords = [];
    for (const prop of [...sampleProperties, ...samplePlots]) {
      const words = prop.title.split(" ").filter((w) => w.length > 3);
      for (const word of words.slice(0, 5)) {
        keywords.push({
          _id: new ObjectId(), propertyId: prop._id, keyword: word.toLowerCase(),
        });
      }
    }
    await db.collection("property_keywords").insertMany(keywords);
    console.log("✓ Keywords created");

    // ========== NOTIFICATIONS ==========
    await db.collection("notifications").insertMany([
      {
        _id: new ObjectId(), userId: agentId, type: "WELCOME",
        title: "Welcome to Igura!", message: "Your account has been created. Start listing your properties!",
        read: false, metadata: null, createdAt: now,
      },
      {
        _id: new ObjectId(), userId: clientId, type: "WELCOME",
        title: "Welcome to Igura!", message: "Browse our listings to find your perfect home or plot.",
        read: false, metadata: null, createdAt: now,
      },
    ]);
    console.log("✓ Notifications created");

    // ========== CREATE INDEXES ==========
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ phone: 1 }, { sparse: true });
    await db.collection("profiles").createIndex({ userId: 1 }, { unique: true });
    await db.collection("memberships").createIndex({ userId: 1 });
    await db.collection("memberships").createIndex({ status: 1 });
    await db.collection("payments").createIndex({ userId: 1 });
    await db.collection("payments").createIndex({ status: 1 });
    await db.collection("payments").createIndex({ reference: 1 });
    await db.collection("properties").createIndex({ marketplaceId: 1 });
    await db.collection("properties").createIndex({ userId: 1 });
    await db.collection("properties").createIndex({ status: 1 });
    await db.collection("properties").createIndex({ propertyTypeId: 1 });
    await db.collection("properties").createIndex({ district: 1 });
    await db.collection("properties").createIndex({ sector: 1 });
    await db.collection("properties").createIndex({ price: 1 });
    await db.collection("properties").createIndex({ createdAt: -1 });
    await db.collection("properties").createIndex({ slug: 1 }, { unique: true });
    await db.collection("properties").createIndex({ title: "text", description: "text" });
    await db.collection("property_images").createIndex({ propertyId: 1 });
    await db.collection("property_keywords").createIndex({ propertyId: 1 });
    await db.collection("property_keywords").createIndex({ keyword: 1 });
    await db.collection("property_types").createIndex({ marketplaceId: 1 });
    await db.collection("property_types").createIndex({ slug: 1 });
    await db.collection("notifications").createIndex({ userId: 1 });
    await db.collection("notifications").createIndex({ read: 1 });
    await db.collection("reports").createIndex({ reporterId: 1 });
    await db.collection("reports").createIndex({ status: 1 });
    await db.collection("location_hierarchies").createIndex({ level: 1 });
    await db.collection("location_hierarchies").createIndex({ district: 1 });
    await db.collection("location_hierarchies").createIndex({ parentId: 1 });
    console.log("✓ Indexes created");

    console.log("\n✅ Database setup complete!");
    console.log("Database: " + DB_NAME);
    console.log("\nTest accounts:");
    console.log("  Admin:          admin@igura.rw / Admin123!");
    console.log("  Commissionaire: agent@igura.rw / Agent123!");
    console.log("  Client:         client@igura.rw / Client123!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setup();
