import { describe, it, expect } from "vitest";
import { buildMembershipGrant, isSafePaymentReference, MEMBERSHIP_DAYS } from "@/lib/payments";

describe("buildMembershipGrant", () => {
  it("sets expiresAt to 30 days from activation (C1: no lifetime grants)", () => {
    const before = new Date();
    const grant = buildMembershipGrant({
      paymentAmount: 20000,
      paymentCurrency: "RWF",
      settledAmount: 20000,
      settledCurrency: "RWF",
    })!;
    const after = new Date();

    expect(grant.status).toBe("ACTIVE");
    expect(grant.expiresAt).toBeInstanceOf(Date);

    const ms = grant.expiresAt!.getTime() - before.getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThanOrEqual(MEMBERSHIP_DAYS - 0.01);
    expect(days).toBeLessThanOrEqual(MEMBERSHIP_DAYS + 0.01);
    expect(grant.activatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(grant.activatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("rejects an underpayment instead of granting (H1)", () => {
    const grant = buildMembershipGrant({
      paymentAmount: 20000,
      paymentCurrency: "RWF",
      settledAmount: 1000,
      settledCurrency: "RWF",
    });
    expect(grant).toBeNull();
  });

  it("rejects a wrong currency instead of granting (H1)", () => {
    const grant = buildMembershipGrant({
      paymentAmount: 20000,
      paymentCurrency: "RWF",
      settledAmount: 20000,
      settledCurrency: "USD",
    });
    expect(grant).toBeNull();
  });

  it("accepts exact amount and currency", () => {
    const grant = buildMembershipGrant({
      paymentAmount: 5000,
      paymentCurrency: "RWF",
      settledAmount: 5000,
      settledCurrency: "RWF",
    })!;
    expect(grant.status).toBe("ACTIVE");
  });

  it("treats a null settled amount as unconfirmed and refuses to grant (H1)", () => {
    const grant = buildMembershipGrant({
      paymentAmount: 20000,
      paymentCurrency: "RWF",
      settledAmount: null,
      settledCurrency: "RWF",
    });
    expect(grant).toBeNull();
  });
});

describe("isSafePaymentReference", () => {
  it("accepts a normal reference", () => {
    expect(isSafePaymentReference("IGURA-abc123_XY")).toBe(true);
  });

  it("rejects query-parameter injection (H2)", () => {
    expect(isSafePaymentReference("legit&amount=1")).toBe(false);
    expect(isSafePaymentReference("legit%26amount=1")).toBe(false);
  });

  it("rejects fragment truncation (H2)", () => {
    expect(isSafePaymentReference("legit#")).toBe(false);
    expect(isSafePaymentReference("legit/../../etc")).toBe(false);
  });

  it("rejects path traversal and whitespace", () => {
    expect(isSafePaymentReference("../../secret")).toBe(false);
    expect(isSafePaymentReference("ref with space")).toBe(false);
  });

  it("rejects empty or absurdly long input", () => {
    expect(isSafePaymentReference("")).toBe(false);
    expect(isSafePaymentReference("x".repeat(101))).toBe(false);
  });
});
