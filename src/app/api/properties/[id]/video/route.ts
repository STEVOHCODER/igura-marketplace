import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { isOwnerOrAdmin } from "@/lib/ownership";
import { uploadPropertyVideo, deletePropertyVideo } from "@/lib/cloudinary";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { checkVideoAccess } from "@/lib/access";
import { detectVideoMimeType, isCompatibleVideoType } from "@/lib/video-validation";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// 25MB was under-sized for the promise this tier makes. A 20-second clip shot
// on a modern phone at 1080p routinely runs 30-60MB, so listers hit "File too
// large" on videos that were inside the 20-second rule they were told about.
// 60MB covers 20s at 1080p on any current handset.
const MAX_SIZE = 60 * 1024 * 1024;

/**
 * Magic-byte sniff. `file.type` comes straight from the client and can be
 * spoofed by renaming a file; this reads what the bytes actually are. MP4
 * variants all carry `ftyp` at offset 4; WEBM is EBML/Matroska; MOV is
 * QuickTime `moov`/`wide`/`mdat`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = enforceRateLimit(request, "property-video", LIMITS.write.limit, LIMITS.write.windowMs);
    if (limited) return limited;

    const session = await getSessionVerified();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      select: { id: true, ownerId: true, videoUrl: true, videoStoragePath: true, videoDurationSeconds: true },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (!isOwnerOrAdmin(session, property.ownerId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const durationRaw = formData.get("duration");
    const clientDuration = durationRaw != null ? Number(durationRaw) : null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: MP4, WEBM, MOV" },
        { status: 400 }
      );
    }

    // The declared MIME type is client-controlled. Read the leading bytes and
    // confirm the file really is a video of that family; a renamed .exe fails
    // here. ISO-BMFF containers are compared as one family because browsers
    // label phone .mov recordings inconsistently.
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const detected = detectVideoMimeType(head);
    if (!isCompatibleVideoType(file.type, detected)) {
      return NextResponse.json(
        { error: "File content does not match the declared type" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      const maxMb = Math.round(MAX_SIZE / (1024 * 1024));
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxMb}MB. Trim the clip or record at a lower resolution.` },
        { status: 400 }
      );
    }

    // Check video access based on plan tier and free period. When the browser
    // could not report a duration we pass 0 so the slot count is still enforced
    // but the duration comparison is skipped. The previous `?? 40` default
    // rejected every such upload with "must be 20 seconds or shorter", which
    // blamed the clip length for a metadata problem.
    const knownDuration = clientDuration != null && Number.isFinite(clientDuration);
    const videoAccess = await checkVideoAccess(session.userId, knownDuration ? clientDuration : 0);
    if (!videoAccess.allowed) {
      return NextResponse.json(
        { error: videoAccess.reason || "Video upload not allowed on your current plan" },
        { status: 403 }
      );
    }

    // Enforce total video count limit
    if (videoAccess.currentVideoCount >= videoAccess.maxTotalVideos) {
      return NextResponse.json(
        { error: `You've used all ${videoAccess.maxTotalVideos} video slots on your plan. Upgrade for more.` },
        { status: 403 }
      );
    }

    // Client-side duration courtesy check
    if (
      clientDuration != null &&
      Number.isFinite(clientDuration) &&
      clientDuration > videoAccess.maxDuration + 1
    ) {
      return NextResponse.json(
        { error: `Video must be ${videoAccess.maxDuration} seconds or shorter` },
        { status: 400 }
      );
    }

    let uploaded: Awaited<ReturnType<typeof uploadPropertyVideo>>;
    try {
      uploaded = await uploadPropertyVideo(file, id);
    } catch (error) {
      console.error("Video storage provider failed:", error);
      return NextResponse.json(
        { error: "Video storage is temporarily unavailable. Your listing was saved; please add the video from the edit page later." },
        { status: 503 }
      );
    }
    const { url, publicId, durationSeconds } = uploaded;

    // Cloudinary supplies authoritative duration metadata. R2 does not
    // inspect media, so R2 uploads require the browser's duration metadata
    // and the same strict limit; Cloudflare Stream or an ffprobe worker can
    // replace this check later for provider-independent verification.
    if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
      if (!publicId.startsWith("r2:") || clientDuration == null || !Number.isFinite(clientDuration)) {
        await deletePropertyVideo(publicId);
        return NextResponse.json(
          { error: "Could not verify the video length. Configure Cloudflare Stream or re-upload with video metadata." },
          { status: 400 }
        );
      }
      if (clientDuration > videoAccess.maxDuration + 1) {
        await deletePropertyVideo(publicId);
        return NextResponse.json(
          { error: `Video must be ${videoAccess.maxDuration} seconds or shorter` },
          { status: 400 }
        );
      }
    }

    if (durationSeconds != null && durationSeconds > videoAccess.maxDuration + 1) {
      await deletePropertyVideo(publicId);
      return NextResponse.json(
        { error: `Video must be ${videoAccess.maxDuration} seconds or shorter` },
        { status: 400 }
      );
    }

    // Store as a new PropertyVideo record
    const existingCount = await prisma.propertyVideo.count({ where: { propertyId: id } });
    const video = await prisma.propertyVideo.create({
      data: {
        propertyId: id,
        url,
        storagePath: publicId,
        durationSeconds: durationSeconds ?? clientDuration ?? null,
        sortOrder: existingCount,
      },
      select: { id: true, url: true, durationSeconds: true, sortOrder: true },
    });

    // Also update legacy fields on Property for backward compatibility
    if (!property.videoUrl) {
      await prisma.property.update({
        where: { id },
        data: {
          videoUrl: url,
          videoStoragePath: publicId,
          videoDurationSeconds: durationSeconds ?? clientDuration ?? null,
        },
      });
    }

    return NextResponse.json({ video, totalVideos: videoAccess.currentVideoCount + 1, maxVideos: videoAccess.maxTotalVideos }, { status: 201 });
  } catch (error) {
    console.error("Upload video error:", error);
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
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (!isOwnerOrAdmin(session, property.ownerId)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (videoId) {
      // Delete specific PropertyVideo
      const video = await prisma.propertyVideo.findUnique({ where: { id: videoId } });
      if (video && video.propertyId === id) {
        if (video.storagePath) await deletePropertyVideo(video.storagePath);
        await prisma.propertyVideo.delete({ where: { id: videoId } });
      }
    } else {
      // Delete all videos for this property
      const videos = await prisma.propertyVideo.findMany({ where: { propertyId: id } });
      for (const v of videos) {
        if (v.storagePath) await deletePropertyVideo(v.storagePath);
      }
      await prisma.propertyVideo.deleteMany({ where: { propertyId: id } });

      // Also clear legacy fields
      if (property.videoStoragePath) await deletePropertyVideo(property.videoStoragePath);
      await prisma.property.update({
        where: { id },
        data: { videoUrl: null, videoStoragePath: null, videoDurationSeconds: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete video error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
