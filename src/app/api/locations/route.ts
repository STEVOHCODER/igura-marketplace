import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");
    const district = searchParams.get("district");
    const sector = searchParams.get("sector");
    const cell = searchParams.get("cell");

    if (!country && !district && !sector && !cell) {
      const countries = await prisma.locationHierarchy.findMany({
        where: { level: "COUNTRY" },
        distinct: ["country"],
        select: { country: true },
        orderBy: { country: "asc" },
      });

      return NextResponse.json({
        locations: countries.map((c) => ({ name: c.country, level: "COUNTRY" })),
      });
    }

    if (country && !district && !sector && !cell) {
      const districts = await prisma.locationHierarchy.findMany({
        where: {
          country,
          level: "DISTRICT",
          district: { not: null },
        },
        distinct: ["district"],
        select: { district: true },
        orderBy: { district: "asc" },
      });

      return NextResponse.json({
        locations: districts.map((d) => ({ name: d.district, level: "DISTRICT" })),
      });
    }

    if (country && district && !sector && !cell) {
      const sectors = await prisma.locationHierarchy.findMany({
        where: {
          country,
          district,
          level: "SECTOR",
          sector: { not: null },
        },
        distinct: ["sector"],
        select: { sector: true },
        orderBy: { sector: "asc" },
      });

      return NextResponse.json({
        locations: sectors.map((s) => ({ name: s.sector, level: "SECTOR" })),
      });
    }

    if (country && district && sector && !cell) {
      const cells = await prisma.locationHierarchy.findMany({
        where: {
          country,
          district,
          sector,
          level: "CELL",
          cell: { not: null },
        },
        distinct: ["cell"],
        select: { cell: true },
        orderBy: { cell: "asc" },
      });

      return NextResponse.json({
        locations: cells.map((c) => ({ name: c.cell, level: "CELL" })),
      });
    }

    if (country && district && sector && cell) {
      const villages = await prisma.locationHierarchy.findMany({
        where: {
          country,
          district,
          sector,
          cell,
          level: "VILLAGE",
          village: { not: null },
        },
        distinct: ["village"],
        select: { village: true },
        orderBy: { village: "asc" },
      });

      return NextResponse.json({
        locations: villages.map((v) => ({ name: v.village, level: "VILLAGE" })),
      });
    }

    return NextResponse.json({ locations: [] });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
