/**
 * Video container sniffing.
 *
 * `file.type` comes from the client and can be spoofed by renaming a file, so
 * the bytes are what decide the container. `ftyp` at offset 4 identifies the
 * ISO base media family (MP4), WEBM is EBML/Matroska, and the QuickTime atom
 * names identify classic MOV.
 */
export function detectVideoMimeType(bytes: Uint8Array): string | null {
  const ascii = (offset: number, length: number) =>
    Array.from(bytes.slice(offset, offset + length))
      .map((byte) => String.fromCharCode(byte))
      .join("");

  if (bytes.length >= 12 && ascii(4, 4) === "ftyp") return "video/mp4";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }
  if (bytes.length >= 8 && ["moov", "wide", "mdat", "free"].includes(ascii(4, 4))) {
    return "video/quicktime";
  }
  return null;
}

/**
 * Whether a sniffed container may be accepted for a client-declared MIME type.
 *
 * This used to be plain equality, which rejected files that are perfectly
 * valid. Browsers label a phone recording `.mov` as `video/quicktime` while the
 * bytes carry `ftyp` - iPhone MOV is an MP4 container - so an exact comparison
 * failed and the user got "File content does not match the declared type" for a
 * file their own camera had produced. Browsers are also inconsistent about
 * generic `video/mp4` vs `video/quicktime` for the same ISO-BMFF container.
 *
 * Both are ISO base media files, so they are one family here. A declared type
 * still has to be a video type we accept: renaming an .exe to .mp4 still fails,
 * because the bytes would sniff as nothing at all.
 */
export function isCompatibleVideoType(declared: string, detected: string | null): boolean {
  if (!detected) return false;

  const ISO_BMFF = new Set(["video/mp4", "video/quicktime", "video/mov", "video/x-m4v"]);
  if (ISO_BMFF.has(declared) && ISO_BMFF.has(detected)) return true;

  return declared === detected;
}