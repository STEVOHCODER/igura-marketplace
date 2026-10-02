import { NextResponse } from "next/server";
import { arePlansVisible, isPaymentsEnabled } from "@/lib/monetization";

/**
 * Public, non-sensitive launch configuration.
 *
 * Lets the client hide plan/membership surfaces without hardcoding a value in
 * the bundle, so `SHOW_PLANS=true` in the environment is enough to restore the
 * commercial layer. Contains no secrets.
 */
export async function GET() {
  return NextResponse.json(
    {
      showPlans: arePlansVisible(),
      paymentsEnabled: isPaymentsEnabled(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}