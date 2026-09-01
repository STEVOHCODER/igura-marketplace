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

    let houseSelling = await prisma.marketplace.findFirst({ where: { name: "House Selling VVIP" } });
    if (!houseSelling) {
      houseSelling = await prisma.marketplace.create({
        data: { name: "House Selling VVIP", displayName: "House Selling VVIP", description: "Premium houses for sale", status: "ACTIVE" },
      });
    }

    // Create the 6 plans (3 marketplaces × 2 roles)
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
      {
        name: "House Selling VVIP Client",
        displayName: "House Selling VVIP Client",
        marketplaceId: houseSelling.id,
        role: "CLIENT",
        price: 10000,
        maxActiveListings: 0,
        maxImagesPerListing: 0,
        features: ["Search all houses for sale", "View full listings", "Contact owners directly", "Save favorites"],
        status: "ACTIVE",
      },
      {
        name: "House Selling VVIP Commissionaire",
        displayName: "House Selling VVIP Commissionaire",
        marketplaceId: houseSelling.id,
        role: "COMMISSIONAIRE",
        price: 25000,
        maxActiveListings: 10,
        maxImagesPerListing: 3,
        features: ["10 active listings", "3 images per listing", "Manage house sales", "VVIP placement"],
        status: "ACTIVE",
      },
    ];

    for (const plan of plans) {
      await prisma.plan.create({ data: plan as any });
    }

    return NextResponse.json({
      success: true,
      message: "6 plans seeded successfully (3 marketplaces × 2 roles)",
      plans: plans.map((p) => ({ name: p.displayName, price: p.price, role: p.role })),
    });
  } catch (error: any) {
    console.error("Seed plans error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
