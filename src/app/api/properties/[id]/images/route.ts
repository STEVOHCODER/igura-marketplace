import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { isOwnerOrAdmin } from "@/lib/ownership";
import { uploadPropertyImage, deletePropertyImage } from "@/lib/cloudinary";
import { ImageRejectedError, toOptimisedImage } from "@/lib/image-transform";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { getListingAllowance } from "@/lib/access";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB as uploaded

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = enforceRateLimit(request, "upload", LIMITS.write.limit, LIMITS.write.windowMs);
    if (limited) return limited;

    const session = await getSessionVerified();
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

    if (!isOwnerOrAdmin(session, property.ownerId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Only the per-listing image cap applies here. The active-listing quota is
    // enforced at publish time (see the PUT guard in [id]/route.ts); reusing it
    // here meant a user sitting at exactly their limit could never add a photo
    // to the listings they had already published.
    const allowance = await getListingAllowance(session.userId);

    if (property.images.length >= allowance.maxImagesPerListing) {
      return NextResponse.json(
        { error: `Image limit reached. Your allowance permits ${allowance.maxImagesPerListing} images per listing.` },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 }
      );
    }

    // Decode once up front to reject anything that is not really an image.
    // The browser-supplied Content-Type is only a claim; a renamed file would
    // sail past a type check. Decoding is also where the stored copy is
    // produced, so this result is reused instead of encoding twice.
    const original = Buffer.from(await file.arrayBuffer());
    let optimised;
    try {
      optimised = await toOptimisedImage(original);
    } catch (error) {
      if (error instanceof ImageRejectedError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const sortOrder = property.images.length;
    const { url, publicId } = await uploadPropertyImage(file, id, sortOrder);

    const image = await prisma.propertyImage.create({
      data: {
        propertyId: id,
        url,
        storagePath: publicId,
        sortOrder,
      },
    });

    return NextResponse.json(
      {
        image,
        // Lets the client confirm what actually landed in storage.
        optimised: {
          contentType: optimised.contentType,
          width: optimised.width,
          height: optimised.height,
          uploadedBytes: optimised.originalBytes,
          storedBytes: optimised.storedBytes,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionVerified();
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

    if (!isOwnerOrAdmin(session, image.property.ownerId)) {
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
