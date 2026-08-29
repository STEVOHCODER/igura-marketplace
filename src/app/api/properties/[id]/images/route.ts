import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadPropertyImage, deletePropertyImage } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const membership = await prisma.membership.findFirst({
      where: {
        userId: session.userId,
        status: "ACTIVE",
        plan: { role: "COMMISSIONAIRE" },
      },
      include: { plan: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No active membership" }, { status: 403 });
    }

    if (property.images.length >= membership.plan.maxImagesPerListing) {
      return NextResponse.json(
        { error: `Image limit reached. Your plan allows ${membership.plan.maxImagesPerListing} images per listing.` },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    const sortOrder = property.images.length;
    const { url, path } = await uploadPropertyImage(file, id, sortOrder);

    const image = await prisma.propertyImage.create({
      data: {
        propertyId: id,
        url,
        storagePath: path,
        sortOrder,
      },
    });

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    const image = await prisma.propertyImage.findUnique({
      where: { id: imageId },
      include: { property: true },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    if (image.property.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (image.storagePath) {
      await deletePropertyImage(image.storagePath);
    }

    await prisma.propertyImage.delete({ where: { id: imageId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
