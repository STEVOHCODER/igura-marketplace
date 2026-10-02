import { NextResponse } from "next/server";
import { getSessionVerified } from "@/lib/auth";
import { getListingAllowance } from "@/lib/access";

/**
 * Listing quota for the dashboard banner: how many ACTIVE slots are used
 * out of how many allowed, and whether publishing is currently blocked.
 */
export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const allowance = await getListingAllowance(session.userId);

    return NextResponse.json({
      activeListings: allowance.activeListings,
      maxActiveListings: allowance.maxActiveListings,
      canPublish: allowance.allowed,
      reason: allowance.reason || null,
      isFreePeriod: allowance.isFreePeriod,
      freePeriodEndsAt: allowance.freePeriodEndsAt || null,
    });
  } catch (error) {
    console.error("Check quota error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
