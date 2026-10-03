import sharp from "sharp";

/**
 * Server-side image normalisation.
 *
 * Every photo is re-encoded to WebP before it reaches Cloudinary or R2, so the
 * bucket only ever holds one copy of an image: the optimised one. The original
 * bytes are decoded in memory and discarded - they are never written anywhere,
 * which is what keeps "compressed + original" from quietly becoming two stored
 * objects per photo.
 *
 * Why re-encode rather than pass the upload through:
 *  - Phone photos are routinely 3000-4000px and 3-5MB. Nothing in the product
 *    renders beyond a ~2000px lightbox, so the excess is pure storage cost.
 *  - WebP at q80 is roughly a quarter to a third smaller than the source JPEG at
 *    the same perceived quality, and browsers decode it faster.
 *  - EXIF carries GPS coordinates. A house photo is very often the seller's own
 *    front door, so the metadata is stripped rather than stored.
 */

/** Long-edge ceiling. The gallery lightbox is the widest consumer. */
export const MAX_DIMENSION = 2000;

/**
 * Quality 80 is sharp's sweet spot for WebP: visually indistinguishable from
 * the source at normal viewing sizes, and far smaller than q90+ for no visible
 * gain on photographic content.
 */
export const WEBP_QUALITY = 80;

/**
 * Refuse anything larger than this before spending CPU on it. A 40MP image can
 * decode to well over 300MB of RGBA, which is a real memory risk on a serverless
 * instance with a fixed ceiling. Legitimate property photos are nowhere near it.
 */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export interface TransformedImage {
  data: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  /** Bytes of the upload as received, for reporting. */
  originalBytes: number;
  /** Bytes actually stored. */
  storedBytes: number;
}

export class ImageRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageRejectedError";
  }
}

async function readDeclaredFormat(input: Buffer): Promise<string | undefined> {
  try {
    const meta = await sharp(input, { limitInputPixels: 400_000_000 }).metadata();
    // Undefined for anything sharp cannot identify, which is the signal we
    // want: reading the real format doubles as content validation, so a renamed
    // executable or an HTML file cannot pass as a photo.
    return meta.format;
  } catch {
    return undefined;
  }
}
export function isSupportedImageFormat(format: string | undefined): boolean {
  return format === "jpeg" || format === "png" || format === "webp" || format === "heif";
}

/**
 * Decode, orient, resize and re-encode to WebP.
 *
 * Throws ImageRejectedError for anything that is not a decodable image, which
 * the upload route turns into a 400. That replaces trusting the browser's
 * self-reported Content-Type, which is trivially spoofable.
 */
export async function toOptimisedImage(input: Buffer): Promise<TransformedImage> {
  if (input.length === 0) {
    throw new ImageRejectedError("The uploaded file is empty.");
  }

  if (input.length > MAX_INPUT_BYTES) {
    throw new ImageRejectedError(
      `Image is too large to process. Maximum is ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)}MB.`
    );
  }

  const format = await readDeclaredFormat(input);
  if (!isSupportedImageFormat(format)) {
    throw new ImageRejectedError(
      "That file is not a readable image. Please upload a JPG, PNG or WebP photo."
    );
  }

  // PNG with an alpha channel has to keep it - a transparent floor plan or a
  // logo on a listing would otherwise come out with a black background.
  const keepAlpha = format === "png";

  // `rotate()` with no argument applies the EXIF orientation and then drops the
  // tag, so a portrait phone photo is not silently stored sideways.
  const output = await sharp(input, { limitInputPixels: 400_000_000 })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4, alphaQuality: keepAlpha ? 100 : undefined })
    .toBuffer({ resolveWithObject: true });

  const meta = output.info;
  if (!meta.width || !meta.height) {
    throw new ImageRejectedError("That image could not be read.");
  }

  return {
    data: output.data,
    contentType: "image/webp",
    width: meta.width,
    height: meta.height,
    originalBytes: input.length,
    storedBytes: output.data.length,
  };
}
