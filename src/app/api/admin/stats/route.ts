import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30d,
      totalListings,
      activeListings,
      pendingListings,
      draftListings,
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      totalReports,
      pendingReports,
      totalRevenue,
      revenue30d,
      revenue7d,
      totalMemberships,
      activeMemberships,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.property.count({ where: { status: { not: "DELETED" } } }),
      prisma.property.count({ where: { status: "ACTIVE" } }),
      prisma.property.count({ where: { status: "UPCOMING" } }),
      prisma.property.count({ where: { status: "DRAFT" } }),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "SUCCESSFUL" } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: "FAILED" } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL" }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL", createdAt: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESSFUL", createdAt: { gte: sevenDaysAgo } }, _sum: { amount: true } }),
      prisma.membership.count(),
      prisma.membership.count({ where: { status: "ACTIVE" } }),
    ]);

    // Recent activity (last 10 actions)
    const recentActions = await prisma.adminAction.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { firstName: true, lastName: true } } },
    });

    // Revenue by marketplace
    const revenueByMarketplace = await prisma.payment.groupBy({
      by: ["planId"],
      where: { status: "SUCCESSFUL" },
      _sum: { amount: true },
      _count: true,
    });

    // Get plan details for revenue breakdown
    const planIds = revenueByMarketplace.map((r) => r.planId);
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      include: { marketplace: { select: { displayName: true } } },
    });
    const planMap = new Map(plans.map((p) => [p.id, p]));

    const marketplaceRevenue = revenueByMarketplace.reduce((acc: Record<string, number>, r) => {
      const plan = planMap.get(r.planId);
      const name = plan?.marketplace?.displayName || "Unknown";
      acc[name] = (acc[name] || 0) + (r._sum.amount || 0);
      return acc;
    }, {});

    // Monthly revenue (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const revenue = await prisma.payment.aggregate({
        where: { status: "SUCCESSFUL", createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      });
      monthlyRevenue.push({
        month: start.toLocaleString("en-RW", { month: "short", year: "numeric" }),
        revenue: revenue._sum.amount || 0,
        transactions: revenue._count,
      });
    }

    // Top viewed listings
    const topListings = await prisma.property.findMany({
      take: 5,
      where: { status: "ACTIVE" },
      orderBy: { viewCount: "desc" },
      select: { id: true, title: true, viewCount: true, price: true, locationDistrict: true },
    });

    return NextResponse.json({
      users: { total: totalUsers, new30d: newUsers30d },
      listings: { total: totalListings, active: activeListings, pending: pendingListings, draft: draftListings },
      payments: { total: totalPayments, successful: successfulPayments, pending: pendingPayments, failed: failedPayments },
      reports: { total: totalReports, pending: pendingReports },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        last30d: revenue30d._sum.amount || 0,
        last7d: revenue7d._sum.amount || 0,
        byMarketplace: marketplaceRevenue,
        monthly: monthlyRevenue,
      },
      memberships: { total: totalMemberships, active: activeMemberships },
      recentActions,
      topListings,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
