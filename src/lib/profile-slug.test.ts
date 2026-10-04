import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Slug uniqueness is the guarantee that stops two agents sharing a URL, so it
 * is tested against a mocked prisma rather than assumed.
 *
 * vi.mock is hoisted above module-level declarations, so the stubs have to be
 * created inside vi.hoisted to exist by the time the factory runs.
 */
const { findMany, findUnique, upsert } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    profile: { findMany, findUnique, upsert },
    user: {},
  },
}));

import { assignProfileSlug, generateUniqueSlug, slugifyName, RESERVED_SLUGS } from "./profile-slug";

beforeEach(() => {
  findMany.mockReset();
  findUnique.mockReset();
  upsert.mockReset();
  findMany.mockResolvedValue([]);
  findUnique.mockResolvedValue(null);
  upsert.mockResolvedValue({});
});

describe("slugifyName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyName("Jean", "Bosco")).toBe("jean-bosco");
  });

  it("folds accents rather than dropping the letters", () => {
    expect(slugifyName("Jean", "Niyonzimana")).toBe("jean-niyonzimana");
    expect(slugifyName("Élie", "Müller")).toBe("elie-muller");
  });

  it("collapses runs of punctuation", () => {
    expect(slugifyName("Jean  -  Bosco", "Nkurunziza!!")).toBe("jean-bosco-nkurunziza");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugifyName("  Jean ", "  Bosco  ")).toBe("jean-bosco");
  });

  it("keeps a very long name within the URL budget", () => {
    const slug = slugifyName("A".repeat(80), "B".repeat(80));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("falls back to a usable slug when nothing survives normalisation", () => {
    const slug = slugifyName("李", "雷");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("generateUniqueSlug", () => {
  it("returns the plain base when it is free", async () => {
    expect(await generateUniqueSlug("Jean", "Bosco")).toBe("jean-bosco");
  });

  it("suffixes when the exact slug is taken by someone else", async () => {
    // Two agents called Jean Bosco must never share a URL.
    findMany.mockResolvedValue([{ slug: "jean-bosco" }]);
    expect(await generateUniqueSlug("Jean", "Bosco")).toBe("jean-bosco-2");
  });

  it("walks up the sequence rather than colliding again", async () => {
    findMany.mockResolvedValue([{ slug: "jean-bosco" }, { slug: "jean-bosco-2" }, { slug: "jean-bosco-3" }]);
    expect(await generateUniqueSlug("Jean", "Bosco")).toBe("jean-bosco-4");
  });

  it("does not treat a prefix match as a collision", async () => {
    // jean-bosco is taken, but jean-bosco-ayaba is a different URL.
    findMany.mockResolvedValue([{ slug: "jean-bosco-ayaba" }]);
    expect(await generateUniqueSlug("Jean", "Bosco")).toBe("jean-bosco");
  });

  it("never issues a reserved path", async () => {
    // A user actually named "Admin" reduces to the reserved segment, so the
    // reserved-word branch has to kick in.
    expect(RESERVED_SLUGS.has("admin")).toBe(true);
    const slug = await generateUniqueSlug("Admin", "");
    expect(RESERVED_SLUGS.has(slug)).toBe(false);
    expect(slug).toBe("admin-agent");
  });

  it("allows a longer name that merely starts with a reserved word", async () => {
    // /agent/admin-user cannot shadow /admin, so it needs no suffix.
    const slug = await generateUniqueSlug("Admin", "User");
    expect(slug).toBe("admin-user");
    expect(RESERVED_SLUGS.has(slug)).toBe(false);
  });

  it("escapes the sequence if it is somehow exhausted", async () => {
    const taken = Array.from({ length: 1200 }, (_, i) => ({ slug: `agent-${i + 2}` }));
    findMany.mockResolvedValue(taken);
    const slug = await generateUniqueSlug("Agent", "");
    expect(slug.startsWith("agent-")).toBe(true);
  });
});

describe("assignProfileSlug", () => {
  it("creates a profile with a slug when none exists", async () => {
    findUnique.mockResolvedValue(null);
    const slug = await assignProfileSlug("u1", "Jean", "Bosco");

    expect(slug).toBe("jean-bosco");
    expect(upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: { userId: "u1", slug: "jean-bosco" },
      update: { slug: "jean-bosco" },
    });
  });

  it("returns the existing slug without touching the database", async () => {
    findUnique.mockResolvedValue({ slug: "jean-bosco-original" });

    const slug = await assignProfileSlug("u1", "Renamed", "Person");

    // The whole point: a rename must not invalidate a link already shared.
    expect(slug).toBe("jean-bosco-original");
    expect(upsert).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("excludes the owner from the collision check so a user cannot collide with itself", async () => {
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([{ slug: "jean-bosco" }]);

    await assignProfileSlug("u1", "Jean", "Bosco");

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { not: "u1" } }),
      })
    );
  });
});
