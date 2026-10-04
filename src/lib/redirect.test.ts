import { describe, expect, it } from "vitest";
import { defaultHomeForRole, safeInternalPath } from "./redirect";

describe("safeInternalPath", () => {
  it("accepts ordinary in-app paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/admin/users")).toBe("/admin/users");
    expect(safeInternalPath("/dashboard/listings/1/edit")).toBe("/dashboard/listings/1/edit");
  });

  it("rejects protocol-relative URLs (the actual open redirect)", () => {
    expect(safeInternalPath("//evil.example")).toBeNull();
    expect(safeInternalPath("//evil.example/steal")).toBeNull();
    expect(safeInternalPath("//example.com?igura.rw")).toBeNull();
  });

  it("rejects the backslash form browsers normalise to protocol-relative", () => {
    expect(safeInternalPath("/\\evil.example")).toBeNull();
    expect(safeInternalPath("/\\/evil.example")).toBeNull();
  });

  it("rejects absolute URLs and non-paths", () => {
    expect(safeInternalPath("https://evil.example")).toBeNull();
    expect(safeInternalPath("javascript:alert(1)")).toBeNull();
    expect(safeInternalPath("dashboard")).toBeNull();
    expect(safeInternalPath("")).toBeNull();
    expect(safeInternalPath(null)).toBeNull();
    expect(safeInternalPath(undefined)).toBeNull();
  });
});

describe("defaultHomeForRole", () => {
  it("sends admins to the admin panel", () => {
    expect(defaultHomeForRole("ADMIN")).toBe("/admin");
    expect(defaultHomeForRole("SUPER_ADMIN")).toBe("/admin");
  });

  it("sends every other role to the dashboard", () => {
    expect(defaultHomeForRole("USER")).toBe("/dashboard");
    expect(defaultHomeForRole("COMMISSIONAIRE")).toBe("/dashboard");
    expect(defaultHomeForRole("CLIENT")).toBe("/dashboard");
    expect(defaultHomeForRole(null)).toBe("/dashboard");
    expect(defaultHomeForRole(undefined)).toBe("/dashboard");
  });
});
