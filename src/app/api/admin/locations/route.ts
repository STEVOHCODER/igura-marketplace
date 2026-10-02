import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";

/**
 * Full flat location hierarchy for the admin table.
 *
 * `/api/locations` is the public, progressively-narrowing dropdown endpoint:
 * with no params it returns only country names, so it cannot back a table
 * that shows country → district → sector → cell → village. This returns every
 * row, ordered as a human reads it.
 */
export async function GET() {
  const session = await getSessionVerified();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const locations = await prisma.locationHierarchy.findMany({
      orderBy: [{ country: "asc" }, { district: "asc" }, { sector: "asc" }, { cell: "asc" }, { village: "asc" }],
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Admin locations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}