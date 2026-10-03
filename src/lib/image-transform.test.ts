import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  ImageRejectedError,
  MAX_DIMENSION,
  isSupportedImageFormat,
  toOptimisedImage,
} from "./image-transform";

/** Solid-colour JPEG at an arbitrary size, so resize behaviour is observable. */
async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 180, g: 90, b: 40 } },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("isSupportedImageFormat", () => {
  it("accepts the formats a phone or camera actually produces", () => {
    expect(isSupportedImageFormat("jpeg")).toBe(true);
    expect(isSupportedImageFormat("png")).toBe(true);
    expect(isSupportedImageFormat("webp")).toBe(true);
    expect(isSupportedImageFormat("heif")).toBe(true);
  });

  it("rejects formats that are not photographs", () => {
    expect(isSupportedImageFormat("svg")).toBe(false);
    expect(isSupportedImageFormat("gif")).toBe(false);
    expect(isSupportedImageFormat("pdf")).toBe(false);
    expect(isSupportedImageFormat(undefined)).toBe(false);
  });
});

describe("toOptimisedImage", () => {
  it("always emits WebP regardless of the source format", async () => {
    const result = await toOptimisedImage(await makeJpeg(800, 600));

    expect(result.contentType).toBe("image/webp");

    // Confirm the bytes really are WebP and not just a renamed buffer.
    const meta = await sharp(result.data).metadata();
    expect(meta.format).toBe("webp");
  });

  it("caps the long edge at the configured maximum", async () => {
    const result = await toOptimisedImage(await makeJpeg(4000, 3000));

    expect(Math.max(result.width, result.height)).toBe(MAX_DIMENSION);
    expect(result.width).toBe(MAX_DIMENSION);
    expect(result.height).toBe(Math.round((3000 / 4000) * MAX_DIMENSION));
  });

  it("leaves smaller images at their original dimensions", async () => {
    const result = await toOptimisedImage(await makeJpeg(640, 480));

    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });

  it("does not upscale an image that is already under the cap", async () => {
    const result = await toOptimisedImage(await makeJpeg(500, 500));

    expect(result.width).toBe(500);
    expect(result.height).toBe(500);
  });

  it("reduces stored bytes for a large photograph", async () => {
    // Noisy source so JPEG has real detail to work with rather than a flat
    // colour, which would compress to almost nothing and prove nothing.
    const noise = Buffer.alloc(1600 * 1200 * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 37 + (i % 251)) % 256;
    const source = await sharp(noise, { raw: { width: 1600, height: 1200, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer();

    const result = await toOptimisedImage(source);

    expect(result.storedBytes).toBeLessThan(result.originalBytes);
    expect(result.storedBytes).toBe(result.data.length);
  });

  it("preserves transparency on a PNG instead of flattening it to black", async () => {
    const png = await sharp({
      create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();

    const result = await toOptimisedImage(png);
    const meta = await sharp(result.data).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.hasAlpha).toBe(true);
  });

  it("applies EXIF orientation so a rotated phone photo is not stored sideways", async () => {
    // Tag 274 = Orientation. 6 means "rotate 90 CW to display", i.e. the stored
    // buffer is landscape but should be shown portrait.
    const landscape = await sharp({
      create: { width: 400, height: 200, channels: 3, background: { r: 20, g: 120, b: 200 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await toOptimisedImage(landscape);

    // After applying orientation the long edge is vertical, not horizontal.
    expect(result.height).toBeGreaterThan(result.width);
  });

  it("strips EXIF, so GPS coordinates are not retained", async () => {
    const withExif = await sharp({
      create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 10, b: 10 } },
    })
      .withExif({ IFD0: { Copyright: "secret location" } })
      .jpeg()
      .toBuffer();

    const result = await toOptimisedImage(withExif);
    const meta = await sharp(result.data).metadata();

    expect(result.contentType).toBe("image/webp");
    // WebP has no EXIF block unless one is explicitly written, and we never
    // pass one through.
    expect(meta.exif).toBeUndefined();
  });

  it("rejects an empty upload", async () => {
    await expect(toOptimisedImage(Buffer.alloc(0))).rejects.toBeInstanceOf(ImageRejectedError);
  });

  it("rejects a non-image even when it is named like one", async () => {
    const notAnImage = Buffer.from("<html><body>definitely not a photo</body></html>");

    await expect(toOptimisedImage(notAnImage)).rejects.toBeInstanceOf(ImageRejectedError);
    await expect(toOptimisedImage(notAnImage)).rejects.toThrow(/not a readable image/i);
  });

  it("rejects an oversized upload before spending CPU on it", async () => {
    const huge = Buffer.alloc(26 * 1024 * 1024, 1);

    await expect(toOptimisedImage(huge)).rejects.toBeInstanceOf(ImageRejectedError);
    await expect(toOptimisedImage(huge)).rejects.toThrow(/too large/i);
  });
});
