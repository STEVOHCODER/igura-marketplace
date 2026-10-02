import { describe, expect, it } from "vitest";
import { isUnknownOutcomeStatus, mapQuickoStatus, normalizeQuickoPayer } from "./quicko";

describe("normalizeQuickoPayer", () => {
  it("accepts local 07XXXXXXXX unchanged", () => {
    expect(normalizeQuickoPayer("0788123456")).toBe("0788123456");
  });

  it("converts 250-format to local 10-digit", () => {
    expect(normalizeQuickoPayer("250788123456")).toBe("0788123456");
  });

  it("strips +, spaces and dashes", () => {
    expect(normalizeQuickoPayer("+250 788-123-456")).toBe("0788123456");
  });

  it("rejects anything that is not a Rwandan mobile number", () => {
    expect(normalizeQuickoPayer("078812345")).toBeNull();
    expect(normalizeQuickoPayer("07881234567")).toBeNull();
    expect(normalizeQuickoPayer("256788123456")).toBeNull();
    expect(normalizeQuickoPayer("")).toBeNull();
    expect(normalizeQuickoPayer(undefined)).toBeNull();
  });
});

describe("mapQuickoStatus", () => {
  it("maps SUCCESS and SUCCESSFUL through", () => {
    expect(mapQuickoStatus("SUCCESS")).toBe("SUCCESSFUL");
    expect(mapQuickoStatus("SUCCESSFUL")).toBe("SUCCESSFUL");
  });

  it("maps terminal failures through", () => {
    expect(mapQuickoStatus("FAILED")).toBe("FAILED");
    expect(mapQuickoStatus("CANCELLED")).toBe("FAILED");
  });

  it("never reads money-back states as paid", () => {
    expect(mapQuickoStatus("REVERSED")).toBe("FAILED");
    expect(mapQuickoStatus("REFUNDED")).toBe("FAILED");
  });

  it("treats everything else (including unknown) as PENDING", () => {
    expect(mapQuickoStatus("PENDING")).toBe("PENDING");
    expect(mapQuickoStatus("PROCESSING")).toBe("PENDING");
    expect(mapQuickoStatus("WHATEVER_NEW")).toBe("PENDING");
    expect(mapQuickoStatus(undefined)).toBe("PENDING");
  });
});

describe("isUnknownOutcomeStatus", () => {
  it("treats transport errors, 429 and 5xx as unknown (never failed)", () => {
    expect(isUnknownOutcomeStatus(0)).toBe(true);
    expect(isUnknownOutcomeStatus(429)).toBe(true);
    for (const s of [500, 502, 503, 599]) {
      expect(isUnknownOutcomeStatus(s)).toBe(true);
    }
  });

  it("treats definite answers as decided", () => {
    for (const s of [200, 201, 202, 400, 401, 403, 404, 409, 422]) {
      expect(isUnknownOutcomeStatus(s)).toBe(false);
    }
  });
});
