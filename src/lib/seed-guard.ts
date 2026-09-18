import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth";

/**
 * Gate for the destructive seed endpoints.
 *
 * `POST /api/seed` runs twenty `deleteMany()` calls and `POST /api/seed-plans`
 * wipes every payment, membership and plan. Both were reachable by anyone on
 * the internet with no authentication — a single unauthenticated curl could
 * destroy the production database.
 *
 * They now require BOTH:
 *   - `SEED_ENABLED=true`, so production stays off unless explicitly opted in, and
 *   - a matching `x-seed-secret` header compared against `SEED_SECRET`.
 */
export function guardSeedRoute(request: NextRequest): NextResponse | null {
  if (process.env.SEED_ENABLED !== "true") {
    return NextResponse.json(
      { error: "Seeding is disabled. Set SEED_ENABLED=true to allow it." },
      { status: 403 }
    );
  }

  const expected = process.env.SEED_SECRET;

  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: "SEED_SECRET is not configured (minimum 16 characters)." },
      { status: 403 }
    );
  }

  const provided = request.headers.get("x-seed-secret") || "";

  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Invalid seed secret." }, { status: 403 });
  }

  return null;
}
