import { describe, expect, it } from "vitest";
import { getMonetizationMode, isPaymentsEnabled, arePlansVisible } from "@/lib/monetization";

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

describe("plan visibility", () => {
  it("hides plans by default so the launch never advertises pricing", () => {
    delete process.env.SHOW_PLANS;

    expect(arePlansVisible()).toBe(false);
  });

  it("shows plans only when explicitly enabled", () => {
    process.env.SHOW_PLANS = "true";

    expect(arePlansVisible()).toBe(true);
  });

  it("fails closed for anything other than a literal true", () => {
    for (const value of ["1", "yes", "TRUE ", "enabled", ""]) {
      process.env.SHOW_PLANS = value;
      expect(arePlansVisible()).toBe(value.trim().toLowerCase() === "true");
    }
  });
});
