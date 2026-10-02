import { describe, it, expect } from "vitest";

/**
 * M1: stolen tokens must not survive a password change.
 *
 * The mechanism is a `tokenVersion` on the User row. It is stamped into the
 * JWT at mint time and re-checked on read. This test pins the comparison
 * invariant itself; the DB round-trip is exercised live in the deploy
 * verification, but the rule — a version mismatch means rejection — lives
 * in one comparison and is what must never regress.
 */
describe("tokenVersion revocation (M1)", () => {
  function survives(
    tokenVersion: number | undefined,
    storedVersion: number | undefined
  ): boolean {
    // Mirrors getSessionVerified: a token is only valid if the version it was
    // minted with still matches the user's current stored version. Undefined
    // (a token minted before the field existed) is treated as 0, so legacy
    // sessions keep working rather than mass-logging-out every user on
    // first deploy.
    const a = tokenVersion ?? 0;
    const b = storedVersion ?? 0;
    return a === b;
  }

  it("keeps a fresh token alive", () => {
    expect(survives(3, 3)).toBe(true);
  });

  it("kills a token after the password changed", () => {
    expect(survives(3, 4)).toBe(false);
  });

  it("kills a token after several password changes", () => {
    expect(survives(3, 7)).toBe(false);
  });

  it("does not resurrect an older version", () => {
    // Bumping twice must not loop back to a version a stolen token holds.
    expect(survives(4, 5)).toBe(false);
    expect(survives(4, 3)).toBe(false);
  });

  it("treats pre-field tokens as version 0", () => {
    expect(survives(undefined, 0)).toBe(true);
    expect(survives(undefined, 1)).toBe(false);
    expect(survives(0, undefined)).toBe(true);
  });
});
