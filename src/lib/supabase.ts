import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const BUCKET_NAME = "property-images";

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadPropertyImage(
  file: File,
  propertyId: string,
  sortOrder: number
): Promise<UploadResult> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `properties/${propertyId}/${sortOrder}-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);

  return { url: publicUrl, path };
}

export async function deletePropertyImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .remove(paths);
  if (error) console.error("Image deletion error:", error.message);
}

export async function deletePropertyImage(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .remove([path]);
  if (error) console.error("Image deletion error:", error.message);
}

/**
 * Separate bucket from images so video moderation/size limits (bucket-level
 * file size cap and MIME allowlist, configured in the Supabase dashboard) can
 * be tuned independently. Create a public "property-videos" bucket before
 * this is used in production — it does not exist automatically.
 */
const VIDEO_BUCKET_NAME = "property-videos";

export async function uploadPropertyVideo(
  file: File,
  propertyId: string
): Promise<UploadResult> {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `properties/${propertyId}/video-${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(VIDEO_BUCKET_NAME).getPublicUrl(path);

  return { url: publicUrl, path };
}

export async function deletePropertyVideo(path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(VIDEO_BUCKET_NAME)
    .remove([path]);
  if (error) console.error("Video deletion error:", error.message);
}
