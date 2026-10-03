import { v2 as cloudinary, UploadApiOptions } from "cloudinary";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { toOptimisedImage } from "./image-transform";

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

function getR2Client(): S3Client | null {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getR2PublicUrl(key: string): string {
  const base = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL is not configured");
  }
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<CloudinaryUploadResult> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!client || !bucket) throw new Error("Cloudflare R2 is not configured");
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
  return { url: getR2PublicUrl(key), publicId: `r2:${key}` };
}

async function deleteFromR2(storagePath: string): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.CLOUDFLARE_R2_BUCKET;
  if (!client || !bucket || !storagePath.startsWith("r2:")) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath.slice(3) }));
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
  const original = Buffer.from(await file.arrayBuffer());

  // The only bytes that reach storage. `original` stays in memory and is
  // discarded when this function returns - the bucket gets one object per
  // image, not an original alongside a compressed copy.
  const optimised = await toOptimisedImage(original);
  const buffer = optimised.data;
  const contentType = optimised.contentType;

  const stamp = Date.now();
  const filename = `${sortOrder}-${stamp}.webp`;

  try {
    assertConfigured();
    const result = await uploadBuffer(buffer, {
      resource_type: "image",
      folder: `igura/properties/${propertyId}/images`,
      public_id: `${sortOrder}-${stamp}`,
      overwrite: false,
      // Cloudinary would otherwise be handed pre-compressed WebP and told to
      // deliver the source format, which can hand back the larger original.
      format: "webp",
    });
    return { url: result.secure_url as string, publicId: result.public_id as string };
  } catch (cloudinaryError) {
    console.error("Cloudinary image upload failed; trying R2 fallback:", cloudinaryError);
    // The extension matters: without one R2 serves the object with no inferred
    // type and some clients refuse to render it.
    return uploadToR2(buffer, `properties/${propertyId}/images/${filename}`, contentType);
  }
}

export async function deletePropertyImage(publicId: string): Promise<void> {
  if (publicId.startsWith("r2:")) {
    try {
      await deleteFromR2(publicId);
    } catch (error) {
      console.error("R2 image deletion error:", error);
    }
    return;
  }
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
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    assertConfigured();
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
  } catch (cloudinaryError) {
    console.error("Cloudinary video upload failed; trying R2 fallback:", cloudinaryError);
    const uploaded = await uploadToR2(
      buffer,
      `properties/${propertyId}/video/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file.type
    );
    return { ...uploaded, durationSeconds: null };
  }
}

export async function deletePropertyVideo(publicId: string): Promise<void> {
  if (publicId.startsWith("r2:")) {
    try {
      await deleteFromR2(publicId);
    } catch (error) {
      console.error("R2 video deletion error:", error);
    }
    return;
  }
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
  } catch (error) {
    console.error("Video deletion error:", error);
  }
}
