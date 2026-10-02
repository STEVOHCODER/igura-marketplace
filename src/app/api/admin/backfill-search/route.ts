import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { buildSearchText } from "@/lib/utils";

/**
 * One-time repair: rebuild the denormalised `searchText` blob on rows that
 * lack it. The original seed wrote listings without the blob, so free-text
 * search matched nothing until this ran. Idempotent — only touches rows
 * with a null blob, 100 per call; repeat until `remaining` is 0.
 */
export async function POST() {
  try {
    const session = await getSessionVerified();
    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // NOTE: `where: { searchText: null }` does NOT match documents where
    // the field is absent entirely (how the seed wrote them), so the filter
    // happens in code. Result sets here are tiny (take 200).
    const candidates = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        locationDistrict: true,
        locationSector: true,
        locationCell: true,
        locationVillage: true,
        searchText: true,
        keywords: { select: { keyword: true } },
      },
      take: 200,
    });
    const missing = candidates.filter((p) => !p.searchText);

    for (const p of missing) {
      await prisma.property.update({
        where: { id: p.id },
        data: {
          searchText: buildSearchText({
            title: p.title,
            description: p.description,
            keywords: p.keywords.map((k) => k.keyword),
            district: p.locationDistrict,
            sector: p.locationSector,
            cell: p.locationCell,
            village: p.locationVillage,
          }),
        },
      });
    }

    const hadBlob = candidates.filter((p) => !!p.searchText).length;
    const total = await prisma.property.count();
    // take-window covers the whole collection at current scale; anything
    // beyond it would need a second call.
    const remaining = Math.max(0, total - hadBlob - missing.length);

    // Diagnostics: what do the kept blobs actually look like?
    const sample = await prisma.property.findMany({
      select: { id: true, title: true, searchText: true },
      take: 200,
    });

    await prisma.adminAction.create({
      data: {
        adminId: session.userId,
        actionType: "SEARCH_BACKFILL",
        targetType: "PROPERTY",
        targetId: "bulk",
        details: { fixed: missing.length, remaining },
      },
    });

    return NextResponse.json({
      fixed: missing.length,
      remaining,
      sample: sample.map((s) => {
        const raw: any = s.searchText;
        return {
          id: s.id,
          title: s.title,
          blobType: Array.isArray(raw) ? "array" : typeof raw,
          blobLen: typeof raw === "string" ? raw.length : Array.isArray(raw) ? raw.length : -1,
          blobPreview: String(Array.isArray(raw) ? raw.join(" | ").slice(0, 120) : raw || "").slice(0, 120),
        };
      }),
    });
  } catch (error) {
    console.error("Search backfill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
