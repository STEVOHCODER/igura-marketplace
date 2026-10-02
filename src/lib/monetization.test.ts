import { describe, expect, it } from "vitest";
import { getMonetizationMode, isPaymentsEnabled } from "@/lib/monetization";

describe("monetization mode", () => {
  it("defaults to free launch mode", () => {
    delete process.env.MONETIZATION_MODE;

    expect(getMonetizationMode()).toBe("free");
    expect(isPaymentsEnabled()).toBe(false);
  });

  it("enables payments only for the live mode", () => {
    process.env.MONETIZATION_MODE = "live";

    expect(getMonetizationMode()).toBe("live");
    expect(isPaymentsEnabled()).toBe(true);
  });

  it("fails closed for unknown modes", () => {
    process.env.MONETIZATION_MODE = "unexpected";

    expect(getMonetizationMode()).toBe("free");
    expect(isPaymentsEnabled()).toBe(false);
  });
});
