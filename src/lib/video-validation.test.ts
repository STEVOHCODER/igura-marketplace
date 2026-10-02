import { describe, expect, it } from "vitest";
import { detectVideoMimeType, isCompatibleVideoType } from "./video-validation";

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

describe("isCompatibleVideoType", () => {
  it("rejects content that is not a video at all", () => {
    expect(isCompatibleVideoType("video/mp4", null)).toBe(false);
  });

  it("rejects a renamed non-video, which is what the sniff exists for", () => {
    // An .exe does not carry any video signature.
    expect(isCompatibleVideoType("video/mp4", detectVideoMimeType(new Uint8Array([0x4d, 0x5a, 0, 0])))).toBe(false);
  });

  it("accepts a matching declared type", () => {
    expect(isCompatibleVideoType("video/webm", "video/webm")).toBe(true);
    expect(isCompatibleVideoType("video/mp4", "video/mp4")).toBe(true);
  });

  // The bug this fixed: a phone recording named .mov is an MP4 container, and
  // browsers label it video/quicktime while the bytes sniff as video/mp4. Exact
  // equality rejected the user's own camera footage.
  it("accepts quicktime-labelled files whose bytes are ISO-BMFF", () => {
    expect(isCompatibleVideoType("video/quicktime", "video/mp4")).toBe(true);
    expect(isCompatibleVideoType("video/mp4", "video/quicktime")).toBe(true);
    expect(isCompatibleVideoType("video/x-m4v", "video/mp4")).toBe(true);
  });

  it("still rejects cross-family mismatches", () => {
    expect(isCompatibleVideoType("video/webm", "video/mp4")).toBe(false);
    expect(isCompatibleVideoType("video/mp4", "video/webm")).toBe(false);
    expect(isCompatibleVideoType("image/png", "video/mp4")).toBe(false);
  });
});
