import { describe, expect, it } from "vitest";
import { canOwnListings, isAdmin, isOwnerOrAdmin } from "./ownership";

const session = (userId: string, role: string) => ({ userId, role }) as any;

describe("isAdmin", () => {
  it("recognises both admin roles", () => {
    expect(isAdmin(session("a", "ADMIN"))).toBe(true);
    expect(isAdmin(session("a", "SUPER_ADMIN"))).toBe(true);
  });

  it("rejects everyone else", () => {
    expect(isAdmin(session("a", "USER"))).toBe(false);
    expect(isAdmin(session("a", "COMMISSIONAIRE"))).toBe(false);
    expect(isAdmin(session("a", "CLIENT"))).toBe(false);
  });

  it("treats a missing session as not admin", () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe("isOwnerOrAdmin", () => {
  it("allows the owner", () => {
    expect(isOwnerOrAdmin(session("owner-1", "USER"), "owner-1")).toBe(true);
  });

  it("refuses a different non-admin user", () => {
    // The core protection: one lister must never touch another's listing.
    expect(isOwnerOrAdmin(session("lister-1", "COMMISSIONAIRE"), "owner-2")).toBe(false);
  });

  it("allows an admin on someone else's listing, which is the whole on-behalf-of feature", () => {
    expect(isOwnerOrAdmin(session("admin-1", "ADMIN"), "owner-2")).toBe(true);
    expect(isOwnerOrAdmin(session("admin-1", "SUPER_ADMIN"), "owner-2")).toBe(true);
  });

  it("refuses when there is no session", () => {
    expect(isOwnerOrAdmin(null, "owner-1")).toBe(false);
  });

  it("refuses when there is no owner to compare against", () => {
    expect(isOwnerOrAdmin(session("admin-1", "ADMIN"), null)).toBe(false);
    expect(isOwnerOrAdmin(session("admin-1", "ADMIN"), undefined)).toBe(false);
  });
});

describe("canOwnListings", () => {
  it("allows the roles that legitimately own property", () => {
    expect(canOwnListings("USER")).toBe(true);
    expect(canOwnListings("CLIENT")).toBe(true);
    expect(canOwnListings("COMMISSIONAIRE")).toBe(true);
  });

  it("refuses admin accounts as listing owners", () => {
    // An admin creating on someone's behalf must target a real lister, not
    // themselves, otherwise the audit trail becomes meaningless.
    expect(canOwnListings("ADMIN")).toBe(false);
    expect(canOwnListings("SUPER_ADMIN")).toBe(false);
  });

  it("refuses unknown or missing roles", () => {
    expect(canOwnListings("GHOST")).toBe(false);
    expect(canOwnListings(null)).toBe(false);
  });
});
