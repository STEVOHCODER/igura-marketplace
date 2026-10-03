import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { propertyUpdateSchema, sanitizePropertyInput } from "@/lib/validators";
import { buildSearchText } from "@/lib/utils";
import { getListingAllowance } from "@/lib/access";
import { redactContact, redactCoordinates, hasRevealedContact } from "@/lib/access";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { deletePropertyImages, deletePropertyVideo } from "@/lib/cloudinary";

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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profile: true,
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Count one view per client IP per 10-minute window, so a seller cannot
    // inflate `viewCount` (which feeds the search relevance score) by
    // refreshing their own listing. Best-effort — a counting failure must
    // never break the page.
    try {
      const key = `view:${property.id}:${clientIp(request)}`;
      const seen = rateLimit(key, 1, 10 * 60 * 1000);
      if (seen.ok) {
        await prisma.property.update({
          where: { id: property.id },
          data: { viewCount: { increment: 1 } },
        });
      }
    } catch {
      // Viewing is best-effort; never 500 because counting failed.
    }

    // Check if current user has revealed contact
    const session = await getSessionVerified();
    const revealed = await hasRevealedContact(session?.userId, property.id, property.ownerId, session?.role);

    // The only backend state behind a "verified owner" badge.
    const ownerMembership = await prisma.membership.findFirst({
      where: { userId: property.ownerId, status: "ACTIVE" },
      select: { expiresAt: true },
    });
    const verifiedOwner = !!ownerMembership && (!ownerMembership.expiresAt || ownerMembership.expiresAt > new Date());

    // Apply redaction to prevent data leaks
    let response = redactCoordinates({ ...property, viewCount: property.viewCount + 1, verifiedOwner });
    response = redactContact(response, revealed);

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
    const session = await getSessionVerified();
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

    const rawBody = await request.json();
    const data = propertyUpdateSchema.parse(sanitizePropertyInput(rawBody));

    // Publishing is the moment a slot is taken: creating a DRAFT is free,
    // flipping DRAFT/UNAVAILABLE → ACTIVE is not. Without this check the
    // create-path quota could be bypassed by publishing drafts freely.
    if (data.status === "ACTIVE" && existing.status !== "ACTIVE") {
      const allowance = await getListingAllowance(session.userId);
      if (!allowance.allowed) {
        return NextResponse.json(
          { error: allowance.reason || "Listing limit reached." },
          { status: 403 }
        );
      }

      // A listing with no photo cannot be judged from a search card, and an
      // empty gallery is the clearest sign of a placeholder listing. Images are
      // uploaded after the row exists, so this belongs at publish time rather
      // than in the create schema.
      const imageCount = await prisma.propertyImage.count({ where: { propertyId: existing.id } });
      if (imageCount < 1) {
        return NextResponse.json(
          { error: "Add at least one photo before publishing this listing." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
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
    if (data.propertyTypeId !== undefined && data.propertyTypeId !== existing.propertyTypeId) {
      // Same guard as the create path: a bad id throws inside Prisma and
      // surfaces as an opaque 500. Only ObjectId-shaped values reach the query.
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(data.propertyTypeId);
      const nextType = isObjectId
        ? await prisma.propertyType.findUnique({ where: { id: data.propertyTypeId } })
        : null;
      if (!nextType) {
        return NextResponse.json(
          { error: "Property type not found. Please refresh and select a type." },
          { status: 400 }
        );
      }
      updateData.propertyTypeId = data.propertyTypeId;
    }
    if (data.status !== undefined) updateData.status = data.status;

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

    // Keep the denormalised search blob in sync: without this, edits to the
    // title/description/location silently drop the listing out of free-text
    // search (the seed rows shipped with NULL searchText for the same
    // reason — see the admin backfill route).
    const touchesSearch =
      data.title !== undefined ||
      data.description !== undefined ||
      data.keywords !== undefined ||
      data.locationDistrict !== undefined ||
      data.locationSector !== undefined ||
      data.locationCell !== undefined ||
      data.locationVillage !== undefined;
    if (touchesSearch) {
      const kwRows = await prisma.propertyKeyword.findMany({
        where: { propertyId: id },
        select: { keyword: true },
      });
      const searchText = buildSearchText({
        title: property.title,
        description: property.description,
        keywords: kwRows.map((k) => k.keyword),
        district: property.locationDistrict,
        sector: property.locationSector,
        cell: property.locationCell,
        village: property.locationVillage,
      });
      await prisma.property.update({ where: { id }, data: { searchText } });
      property.searchText = searchText;
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
    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.property.findUnique({
      where: { id },
      include: { images: true, videos: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (existing.ownerId !== session.userId) {
      // Admins moderate other people's listings from /admin/listings, so the
      // delete button they see has to work. Previously this returned 403 for
      // every admin, silently, because an admin is never the owner.
      const isAdmin = session.role === "ADMIN" || session.role === "SUPER_ADMIN";
      if (!isAdmin) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      await prisma.adminAction.create({
        data: {
          adminId: session.userId,
          actionType: "PROPERTY_DELETED",
          targetType: "PROPERTY",
          targetId: id,
          details: { propertyTitle: existing.title, previousStatus: existing.status, byAdmin: true },
        },
      });
    }

    // Media is destroyed for real: the photo and video objects are removed from
    // Cloudinary/R2 and their rows are dropped, so a deleted listing stops
    // consuming storage. The property row itself is only soft-deleted, so the
    // owner's view and paid-reveal history survives - that history is the
    // record of interest they earned, and it is tiny compared to the media.
    //
    // Consequence worth being explicit about: restoring a deleted listing brings
    // back the text, price and lead history, but not the photos or video.
    const imagePaths = (existing.images || [])
      .map((img) => img.storagePath || img.url)
      .filter((p): p is string => !!p);

    let mediaFreed = 0;
    try {
      await deletePropertyImages(imagePaths);
      mediaFreed += imagePaths.length;
    } catch (error) {
      // A storage failure must not block the delete; the rows are still
      // cleared below and the orphaned object is logged for cleanup.
      console.error("Failed to free listing images from storage:", error);
    }

    const videoPath = existing.videoStoragePath || existing.videoUrl;
    if (videoPath) {
      try {
        await deletePropertyVideo(videoPath);
        mediaFreed += 1;
      } catch (error) {
        console.error("Failed to free listing video from storage:", error);
      }
    }

    // Clear the media rows so nothing points at a file that no longer exists.
    await prisma.propertyImage.deleteMany({ where: { propertyId: id } });
    await prisma.propertyVideo.deleteMany({ where: { propertyId: id } });
    await prisma.property.update({
      where: { id },
      data: { status: "DELETED", videoUrl: null, videoStoragePath: null, videoDurationSeconds: null },
    });

    return NextResponse.json({ success: true, mediaFreed });
  } catch (error) {
    console.error("Delete property error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
