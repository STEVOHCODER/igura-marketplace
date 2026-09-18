import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { uploadPropertyVideo, deletePropertyVideo } from "@/lib/cloudinary";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB — generous for a <=40s clip
const MAX_DURATION_SECONDS = 40;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limited = enforceRateLimit(request, "property-video", LIMITS.write.limit, LIMITS.write.windowMs);
    if (limited) return limited;

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({ where: { id } });

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

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 25MB" },
        { status: 400 }
      );
    }

    // Fast-fail on the client-reported duration before spending an upload —
    // but this is only a courtesy check. It's a <video>.duration value the
    // caller supplied, so it can't be trusted; a crafted request could omit
    // or lie about it. Allow a 1s tolerance for encoder/container rounding.
    if (
      clientDuration != null &&
      Number.isFinite(clientDuration) &&
      clientDuration > MAX_DURATION_SECONDS + 1
    ) {
      return NextResponse.json(
        { error: `Video must be ${MAX_DURATION_SECONDS} seconds or shorter` },
        { status: 400 }
      );
    }

    const { url, publicId, durationSeconds } = await uploadPropertyVideo(file, id);

    // Authoritative check: Cloudinary decodes the uploaded file and reports
    // its real duration, so this cannot be spoofed the way the client-side
    // value above can. Reject and clean up immediately if it's still over.
    if (
      durationSeconds != null &&
      Number.isFinite(durationSeconds) &&
      durationSeconds > MAX_DURATION_SECONDS + 1
    ) {
      await deletePropertyVideo(publicId);
      return NextResponse.json(
        { error: `Video must be ${MAX_DURATION_SECONDS} seconds or shorter` },
        { status: 400 }
      );
    }

    // Replacing an existing video — delete the old asset so storage doesn't leak.
    if (property.videoStoragePath) {
      await deletePropertyVideo(property.videoStoragePath);
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        videoUrl: url,
        videoStoragePath: publicId,
        videoDurationSeconds: durationSeconds,
      },
      select: { videoUrl: true, videoDurationSeconds: true },
    });

    return NextResponse.json({ video: updated }, { status: 201 });
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({ where: { id } });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    if (property.ownerId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (property.videoStoragePath) {
      await deletePropertyVideo(property.videoStoragePath);
    }

    await prisma.property.update({
      where: { id },
      data: { videoUrl: null, videoStoragePath: null, videoDurationSeconds: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete video error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
