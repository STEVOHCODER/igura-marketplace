import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardSeedRoute } from "@/lib/seed-guard";

export async function POST(request: NextRequest) {
  // Wipes every payment, membership and plan — gated behind SEED_ENABLED and
  // the x-seed-secret header rather than being open to the internet.
  const blocked = guardSeedRoute(request);
  if (blocked) return blocked;

  try {
    // Delete in order: payments → memberships → plans (foreign key chain)
    await prisma.contactReveal.deleteMany();
    await prisma.paymentEvent.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.membership.deleteMany();
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

    // Create 9 plans: 3 marketplaces × 3 tiers (Starter/Professional/Enterprise)
    // Clients browse free — no client plans needed
    // Video: Starter = no video, Professional = 20s (2 total), Enterprise = 40s (3 total)
    const plans = [
      // ── House Rental ──
      {
        name: "Rental Starter",
        displayName: "Starter",
        marketplaceId: rental.id,
        role: "COMMISSIONAIRE",
        price: 5000,
        maxActiveListings: 5,
        maxImagesPerListing: 3,
        maxVideoLengthSeconds: 0,
        maxTotalVideos: 0,
        features: [
          "5 active listings",
          "3 images per listing",
          "Basic search visibility",
          "Contact leads from clients",
          "30-day free trial",
        ],
        status: "ACTIVE",
      },
      {
        name: "Rental Professional",
        displayName: "Professional",
        marketplaceId: rental.id,
        role: "COMMISSIONAIRE",
        price: 15000,
        maxActiveListings: 20,
        maxImagesPerListing: 6,
        maxVideoLengthSeconds: 20,
        maxTotalVideos: 2,
        features: [
          "20 active listings",
          "6 images per listing",
          "2 video uploads (20s each)",
          "Priority search placement",
          "Contact leads from clients",
          "Listing analytics (views, contact reveals)",
        ],
        status: "ACTIVE",
      },
      {
        name: "Rental Enterprise",
        displayName: "Enterprise",
        marketplaceId: rental.id,
        role: "COMMISSIONAIRE",
        price: 40000,
        maxActiveListings: 999,
        maxImagesPerListing: 10,
        maxVideoLengthSeconds: 40,
        maxTotalVideos: 3,
        features: [
          "Unlimited active listings",
          "10 images per listing",
          "3 video uploads (40s each)",
          "Top search placement",
          "Contact leads from clients",
          "Full analytics dashboard",
          "Homepage featured listings",
        ],
        status: "ACTIVE",
      },

      // ── Plot Selling ──
      {
        name: "Plot Starter",
        displayName: "Starter",
        marketplaceId: plot.id,
        role: "COMMISSIONAIRE",
        price: 8000,
        maxActiveListings: 5,
        maxImagesPerListing: 3,
        maxVideoLengthSeconds: 0,
        maxTotalVideos: 0,
        features: [
          "5 active listings",
          "3 images per listing",
          "Basic search visibility",
          "Contact leads from clients",
          "30-day free trial",
        ],
        status: "ACTIVE",
      },
      {
        name: "Plot Professional",
        displayName: "Professional",
        marketplaceId: plot.id,
        role: "COMMISSIONAIRE",
        price: 25000,
        maxActiveListings: 20,
        maxImagesPerListing: 6,
        maxVideoLengthSeconds: 20,
        maxTotalVideos: 2,
        features: [
          "20 active listings",
          "6 images per listing",
          "2 video uploads (20s each)",
          "Priority search placement",
          "Contact leads from clients",
          "Listing analytics (views, contact reveals)",
        ],
        status: "ACTIVE",
      },
      {
        name: "Plot Enterprise",
        displayName: "Enterprise",
        marketplaceId: plot.id,
        role: "COMMISSIONAIRE",
        price: 60000,
        maxActiveListings: 999,
        maxImagesPerListing: 10,
        maxVideoLengthSeconds: 40,
        maxTotalVideos: 3,
        features: [
          "Unlimited active listings",
          "10 images per listing",
          "3 video uploads (40s each)",
          "Top search placement",
          "Contact leads from clients",
          "Full analytics dashboard",
          "Homepage featured listings",
        ],
        status: "ACTIVE",
      },

      // ── House Selling (VVIP) ──
      {
        name: "VVIP Starter",
        displayName: "Starter",
        marketplaceId: houseSelling.id,
        role: "COMMISSIONAIRE",
        price: 10000,
        maxActiveListings: 5,
        maxImagesPerListing: 3,
        maxVideoLengthSeconds: 0,
        maxTotalVideos: 0,
        features: [
          "5 active listings",
          "3 images per listing",
          "Basic search visibility",
          "Contact leads from clients",
          "30-day free trial",
        ],
        status: "ACTIVE",
      },
      {
        name: "VVIP Professional",
        displayName: "Professional",
        marketplaceId: houseSelling.id,
        role: "COMMISSIONAIRE",
        price: 30000,
        maxActiveListings: 20,
        maxImagesPerListing: 6,
        maxVideoLengthSeconds: 20,
        maxTotalVideos: 2,
        features: [
          "20 active listings",
          "6 images per listing",
          "2 video uploads (20s each)",
          "Priority search placement",
          "Contact leads from clients",
          "Listing analytics (views, contact reveals)",
        ],
        status: "ACTIVE",
      },
      {
        name: "VVIP Enterprise",
        displayName: "Enterprise",
        marketplaceId: houseSelling.id,
        role: "COMMISSIONAIRE",
        price: 75000,
        maxActiveListings: 999,
        maxImagesPerListing: 10,
        maxVideoLengthSeconds: 40,
        maxTotalVideos: 3,
        features: [
          "Unlimited active listings",
          "10 images per listing",
          "3 video uploads (40s each)",
          "Top search placement",
          "Contact leads from clients",
          "Full analytics dashboard",
          "Homepage featured listings",
        ],
        status: "ACTIVE",
      },
    ];

    for (const plan of plans) {
      await prisma.plan.create({ data: plan as any });
    }

    return NextResponse.json({
      success: true,
      message: "9 plans seeded successfully (3 marketplaces × 3 tiers: Starter/Professional/Enterprise)",
      plans: plans.map((p) => ({ name: p.name, price: p.price, role: p.role, listings: p.maxActiveListings })),
    });
  } catch (error: any) {
    console.error("Seed plans error:", error);
    return NextResponse.json({ success: false, error: "Failed to seed plans. Check server logs." }, { status: 500 });
  }
}
