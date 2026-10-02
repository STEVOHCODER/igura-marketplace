import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionVerified } from "@/lib/auth";
import { uploadPropertyVideo, deletePropertyVideo } from "@/lib/cloudinary";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { checkVideoAccess } from "@/lib/access";
import { detectVideoMimeType } from "@/lib/video-validation";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 25 * 1024 * 1024;

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

    if (property.ownerId !== session.userId) {
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
    // confirm the file really is what it claims; a renamed .exe fails here.
    const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
    const detected = detectVideoMimeType(head);
    if (!detected || detected !== file.type) {
      return NextResponse.json(
        { error: "File content does not match the declared type" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 25MB" },
        { status: 400 }
      );
    }

    // Check video access based on plan tier and free period
    const videoDuration = clientDuration ?? 40;
    const videoAccess = await checkVideoAccess(session.userId, videoDuration);
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

    // Authoritative Cloudinary duration check.
    //
    // Fail closed when the provider reports no duration: the client-declared
    // `duration` field is attacker-controlled and was previously trusted
    // unconditionally here, so a Starter-plan user could upload a long video
    // by sending `duration=5` and hoping Cloudinary stayed quiet.
    if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
      await deletePropertyVideo(publicId);
      return NextResponse.json(
        { error: "Could not verify the video length. Please re-upload the video." },
        { status: 400 }
      );
    }

    if (durationSeconds > videoAccess.maxDuration + 1) {
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
        durationSeconds: durationSeconds ?? null,
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
          videoDurationSeconds: durationSeconds,
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

    if (property.ownerId !== session.userId) {
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
