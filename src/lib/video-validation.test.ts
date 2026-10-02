import { describe, expect, it } from "vitest";
import { detectVideoMimeType } from "./video-validation";

describe("detectVideoMimeType", () => {
  it("recognizes MP4 files by their ftyp signature", () => {
    const bytes = new Uint8Array([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]);
    expect(detectVideoMimeType(bytes)).toBe("video/mp4");
  });

  it("recognizes WEBM files by their EBML signature", () => {
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
    expect(detectVideoMimeType(bytes)).toBe("video/webm");
  });

  it("rejects unknown file contents", () => {
    expect(detectVideoMimeType(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });
});
