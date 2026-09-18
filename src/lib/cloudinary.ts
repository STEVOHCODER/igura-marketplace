import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import { Readable } from "stream";

/**
 * All three values are required. There is no fallback — an upload attempted
 * without full config throws immediately instead of silently hitting
 * Cloudinary's default (wrong) account.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function assertConfigured() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env."
    );
  }
}

function uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<any> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error || new Error("Cloudinary upload failed"));
      resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  sortOrder: number
): Promise<CloudinaryUploadResult> {
  assertConfigured();
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadBuffer(buffer, {
    resource_type: "image",
    folder: `igura/properties/${propertyId}/images`,
    public_id: `${sortOrder}-${Date.now()}`,
    overwrite: false,
  });

  return { url: result.secure_url as string, publicId: result.public_id as string };
}

export async function deletePropertyImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (error) {
    console.error("Image deletion error:", error);
  }
}

export async function deletePropertyImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  await Promise.all(publicIds.map((id) => deletePropertyImage(id)));
}

export interface CloudinaryVideoUploadResult {
  url: string;
  publicId: string;
  /**
   * Measured by Cloudinary from the decoded file itself — unlike a
   * client-reported <video>.duration, this cannot be spoofed by a crafted
   * upload request, so it is the authoritative value for the 40s cap.
   */
  durationSeconds: number | null;
}

export async function uploadPropertyVideo(
  file: File,
  propertyId: string
): Promise<CloudinaryVideoUploadResult> {
  assertConfigured();
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadBuffer(buffer, {
    resource_type: "video",
    folder: `igura/properties/${propertyId}/video`,
    overwrite: true,
  });

  return {
    url: result.secure_url as string,
    publicId: result.public_id as string,
    durationSeconds: typeof result.duration === "number" ? Math.round(result.duration) : null,
  };
}

export async function deletePropertyVideo(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.error("Video deletion error:", error);
  }
}
