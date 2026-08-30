import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Delete existing memberships first (they reference plans)
    await prisma.membership.deleteMany();
    // Delete existing plans
    await prisma.plan.deleteMany();

    // Find or create marketplaces
    let rental = await prisma.marketplace.findFirst({ where: { name: "House Rental" } });
    if (!rental) {
      rental = await prisma.marketplace.create({
        data: { name: "House Rental", displayName: "House Rental", description: "Find houses and apartments for rent", status: "ACTIVE" },
      });
    }

    let plot = await prisma.marketplace.findFirst({ where: { name: "Plot Selling VIP" } });
    if (!plot) {
      plot = await prisma.marketplace.create({
        data: { name: "Plot Selling VIP", displayName: "Plot Selling VIP", description: "Premium plots and land for sale", status: "ACTIVE" },
      });
    }

    // Create the 4 correct plans
    const plans = [
      {
        name: "House Client",
        displayName: "House Client",
        marketplaceId: rental.id,
        role: "CLIENT",
        price: 2000,
        maxActiveListings: 0,
        maxImagesPerListing: 0,
        features: ["Search all houses", "View full listings", "Contact owners directly", "Save favorites"],
        status: "ACTIVE",
      },
      {
        name: "House Commissionaire",
        displayName: "House Commissionaire",
        marketplaceId: rental.id,
        role: "COMMISSIONAIRE",
        price: 5000,
        maxActiveListings: 10,
        maxImagesPerListing: 3,
        features: ["10 active listings", "3 images per listing", "Manage properties", "Contact leads"],
        status: "ACTIVE",
      },
      {
        name: "Plot Client",
        displayName: "Plot Client",
        marketplaceId: plot.id,
        role: "CLIENT",
        price: 15000,
        maxActiveListings: 0,
        maxImagesPerListing: 0,
        features: ["Search all plots", "View full listings", "Contact owners directly", "Save favorites"],
        status: "ACTIVE",
      },
      {
        name: "Plot Commissionaire",
        displayName: "Plot Commissionaire",
        marketplaceId: plot.id,
        role: "COMMISSIONAIRE",
        price: 20000,
        maxActiveListings: 10,
        maxImagesPerListing: 3,
        features: ["10 active listings", "3 images per listing", "Manage plots", "Premium placement"],
        status: "ACTIVE",
      },
    ];

    for (const plan of plans) {
      await prisma.plan.create({ data: plan as any });
    }

    return NextResponse.json({
      success: true,
      message: "4 plans seeded successfully (House/Plot × Client/Commissionaire)",
      plans: plans.map((p) => ({ name: p.displayName, price: p.price, role: p.role, marketplace: p.marketplaceId })),
    });
  } catch (error: any) {
    console.error("Seed plans error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
