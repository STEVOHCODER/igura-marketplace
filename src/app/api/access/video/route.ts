import { NextResponse } from "next/server";
import { getSessionVerified } from "@/lib/auth";
import { getListingAllowance } from "@/lib/access";

export async function GET() {
  try {
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({
        videoAllowed: false,
        maxVideoLengthSeconds: 0,
        reason: "Not authenticated"
      });
    }

    const allowance = await getListingAllowance(session.userId);
    return NextResponse.json({
      videoAllowed: allowance.maxVideoLengthSeconds > 0,
      maxVideoLengthSeconds: allowance.maxVideoLengthSeconds,
      maxTotalVideos: allowance.maxTotalVideos,
      isFreePeriod: allowance.isFreePeriod,
      freePeriodEndsAt: allowance.freePeriodEndsAt,
    });
  } catch (error) {
    console.error("Check video access error:", error);
    return NextResponse.json({
      videoAllowed: false,
      maxVideoLengthSeconds: 0,
      reason: "Internal server error"
    }, { status: 500 });
  }
}
