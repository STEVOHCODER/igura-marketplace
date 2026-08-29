import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Marketplaces
  const houseRental = await prisma.marketplace.upsert({
    where: { name: "house_rental" },
    update: {},
    create: {
      name: "house_rental",
      displayName: "House Rental",
      description: "Find houses for rent",
      sortOrder: 1,
    },
  });

  const plotSale = await prisma.marketplace.upsert({
    where: { name: "plot_sale" },
    update: {},
    create: {
      name: "plot_sale",
      displayName: "Plot Selling (VIP)",
      description: "Find plots for sale",
      sortOrder: 2,
    },
  });

  const houseSale = await prisma.marketplace.upsert({
    where: { name: "house_sale" },
    update: {},
    create: {
      name: "house_sale",
      displayName: "House Selling (VVIP)",
      description: "Find houses for sale",
      sortOrder: 3,
    },
  });

  console.log("Marketplaces seeded.");

  // 2. Plans
  const plansData = [
    { marketplaceId: houseRental.id, name: "rental_commissionaire", displayName: "House Rental Commissionaire", role: "COMMISSIONAIRE", price: 5000, maxActiveListings: 10, maxImagesPerListing: 3 },
    { marketplaceId: houseRental.id, name: "rental_client", displayName: "House Rental Client", role: "CLIENT", price: 2000, maxActiveListings: 0, maxImagesPerListing: 0 },
    { marketplaceId: plotSale.id, name: "plot_commissionaire", displayName: "Plot Commissionaire (VIP)", role: "COMMISSIONAIRE", price: 20000, maxActiveListings: 10, maxImagesPerListing: 3 },
    { marketplaceId: plotSale.id, name: "plot_client", displayName: "Plot Client (VIP)", role: "CLIENT", price: 15000, maxActiveListings: 0, maxImagesPerListing: 0 },
    { marketplaceId: houseSale.id, name: "house_sale_commissionaire", displayName: "House Sale Commissionaire (VVIP)", role: "COMMISSIONAIRE", price: 30000, maxActiveListings: 10, maxImagesPerListing: 3 },
    { marketplaceId: houseSale.id, name: "house_sale_client", displayName: "House Sale Client (VVIP)", role: "CLIENT", price: 20000, maxActiveListings: 0, maxImagesPerListing: 0 },
  ];

  for (const p of plansData) {
    await prisma.plan.upsert({ where: { name: p.name }, update: {}, create: p });
  }
  console.log("Plans seeded.");

  // 3. Property Types - House Rental
  const houseTypes = [
    { marketplaceId: houseRental.id, name: "shambrette", slug: "shambrette", displayName: "Shambrette (Single Room)", sortOrder: 1 },
    { marketplaceId: houseRental.id, name: "room_salon", slug: "room-salon", displayName: "Room + Salon", sortOrder: 2 },
    { marketplaceId: houseRental.id, name: "2_room_salon", slug: "2-room-salon", displayName: "2 Rooms + Salon", sortOrder: 3 },
    { marketplaceId: houseRental.id, name: "3_room_salon", slug: "3-room-salon", displayName: "3 Rooms + Salon", sortOrder: 4 },
    { marketplaceId: houseRental.id, name: "other", slug: "other", displayName: "Other", sortOrder: 5 },
  ];

  for (const t of houseTypes) {
    await prisma.propertyType.upsert({
      where: { marketplaceId_slug: { marketplaceId: t.marketplaceId, slug: t.slug } },
      update: {},
      create: t,
    });
  }

  // Plot Types
  const plotTypes = [
    { marketplaceId: plotSale.id, name: "residential", slug: "residential", displayName: "Residential Plot", sortOrder: 1 },
    { marketplaceId: plotSale.id, name: "commercial", slug: "commercial", displayName: "Commercial Plot", sortOrder: 2 },
    { marketplaceId: plotSale.id, name: "industrial", slug: "industrial", displayName: "Industrial Plot", sortOrder: 3 },
    { marketplaceId: plotSale.id, name: "farming", slug: "farming", displayName: "Farming Plot", sortOrder: 4 },
    { marketplaceId: plotSale.id, name: "other", slug: "other", displayName: "Other", sortOrder: 5 },
  ];

  for (const t of plotTypes) {
    await prisma.propertyType.upsert({
      where: { marketplaceId_slug: { marketplaceId: t.marketplaceId, slug: t.slug } },
      update: {},
      create: t,
    });
  }
  console.log("Property types seeded.");

  // 4. Admin User
  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@igura.rw" } });
  if (!existingAdmin) {
    const hashedPassword = await hash("Admin123!", 12);
    await prisma.user.create({
      data: {
        email: "admin@igura.rw",
        phone: "0700000000",
        passwordHash: hashedPassword,
        firstName: "Admin",
        lastName: "Igura",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    console.log("Admin user seeded (admin@igura.rw / Admin123!).");
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // 5. Rwanda Locations
  const rwanda = await prisma.locationHierarchy.upsert({
    where: { id: "rwanda_country" },
    update: {},
    create: { id: "rwanda_country", country: "Rwanda", level: "COUNTRY" },
  });

  const districts: { name: string; sectors: string[] }[] = [
    { name: "Gasabo", sectors: ["Kacyiru", "Kimironko", "Gisozi"] },
    { name: "Kicukiro", sectors: ["Kagugu", "Niboye", "Gikondo"] },
    { name: "Nyarugenge", sectors: ["Kigali", "Nyamirambo", "Rwezamenyo"] },
    { name: "Huye", sectors: ["Karama", "Ngoma", "Mukura"] },
    { name: "Rubavu", sectors: ["Gisenyi", "Cyanzarwe", "Nyundo"] },
    { name: "Musanze", sectors: ["Muhoza", "Kinigi", "Remera"] },
    { name: "Nyagatare", sectors: ["Nyagatare", "Karama", "Karangazi"] },
    { name: "Rwamagana", sectors: ["Rwamagana", "Muhazi", "Gahengeri"] },
    { name: "Muhanga", sectors: ["Muhanga", "Cyeza", "Nyabikenke"] },
    { name: "Kayonza", sectors: ["Kayonza", "Kabare", "Mukarange"] },
    { name: "Gicumbi", sectors: ["Gicumbi", "Byumba", "Rukomo"] },
    { name: "Nyanza", sectors: ["Nyanza", "Busasamana", "Gitarama"] },
    { name: "Bugesera", sectors: ["Nyamata", "Ntarama", "Rilima"] },
  ];

  for (const d of districts) {
    const districtId = `rwanda_${d.name.toLowerCase()}`;
    const districtRecord = await prisma.locationHierarchy.upsert({
      where: { id: districtId },
      update: {},
      create: {
        id: districtId,
        country: "Rwanda",
        district: d.name,
        level: "DISTRICT",
        parentId: rwanda.id,
      },
    });

    for (const sectorName of d.sectors) {
      const sectorId = `rwanda_${d.name.toLowerCase()}_${sectorName.toLowerCase()}`;
      await prisma.locationHierarchy.upsert({
        where: { id: sectorId },
        update: {},
        create: {
          id: sectorId,
          country: "Rwanda",
          district: d.name,
          sector: sectorName,
          level: "SECTOR",
          parentId: districtRecord.id,
        },
      });
    }
  }
  console.log("Rwanda locations seeded.");

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
