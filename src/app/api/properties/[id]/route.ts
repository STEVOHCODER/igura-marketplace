import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { propertySchema } from "@/lib/validators";
import { deletePropertyImages } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const property = await prisma.property.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: "ACTIVE",
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        keywords: true,
        features: true,
        propertyType: true,
        marketplace: true,
        owner: {
          include: { profile: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profile: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    await prisma.property.update({
      where: { id: property.id },
      data: { viewCount: { increment: 1 } },
    });

    const response: any = { ...property, viewCount: property.viewCount + 1 };

    if (!property.coordinatesRevealed) {
      delete response.latitude;
      delete response.longitude;
    }

    return NextResponse.json({ property: response });
  } catch (error) {
    console.error("Get property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.property.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existing.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = propertySchema.partial().parse(body);

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.propertyTypeId !== undefined) updateData.propertyTypeId = data.propertyTypeId;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.negotiable !== undefined) updateData.negotiable = data.negotiable;
    if (data.availabilityStatus !== undefined) updateData.availabilityStatus = data.availabilityStatus;
    if (data.availabilityDate !== undefined) {
      updateData.availabilityDate = data.availabilityDate ? new Date(data.availabilityDate) : null;
    }
    if (data.latitude !== undefined) updateData.latitude = data.latitude;
    if (data.longitude !== undefined) updateData.longitude = data.longitude;
    if (data.coordinatesRevealed !== undefined) updateData.coordinatesRevealed = data.coordinatesRevealed;
    if (data.locationCountry !== undefined) updateData.locationCountry = data.locationCountry;
    if (data.locationDistrict !== undefined) updateData.locationDistrict = data.locationDistrict;
    if (data.locationSector !== undefined) updateData.locationSector = data.locationSector;
    if (data.locationCell !== undefined) updateData.locationCell = data.locationCell;
    if (data.locationVillage !== undefined) updateData.locationVillage = data.locationVillage;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
    if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
    if (data.areaValue !== undefined) updateData.areaValue = data.areaValue;
    if (data.areaUnit !== undefined) updateData.areaUnit = data.areaUnit;

    if (data.title !== undefined && data.title !== existing.title) {
      updateData.slug = `${data.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "")}-${existing.id.slice(-6)}`;
    }

    const property = await prisma.property.update({
      where: { id },
      data: updateData,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        propertyType: true,
        marketplace: true,
      },
    });

    if (data.keywords !== undefined) {
      await prisma.propertyKeyword.deleteMany({ where: { propertyId: id } });
      if (data.keywords.length > 0) {
        await prisma.propertyKeyword.createMany({
          data: data.keywords.map((keyword) => ({
            propertyId: id,
            keyword,
          })),
        });
      }
    }

    return NextResponse.json({ property });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.message }, { status: 400 });
    }
    console.error("Update property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.property.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existing.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const storagePaths = existing.images
      .map((img) => img.storagePath)
      .filter((path): path is string => !!path);

    if (storagePaths.length > 0) {
      await deletePropertyImages(storagePaths);
    }

    await prisma.property.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
