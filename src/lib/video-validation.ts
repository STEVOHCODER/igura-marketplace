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
  ) return "video/webm";
  if (bytes.length >= 8 && ["moov", "wide", "mdat", "free"].includes(ascii(4, 4))) {
    return "video/quicktime";
  }
  return null;
}
