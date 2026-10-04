import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

/**
 * Generated per request, never at build time.
 *
 * A build-time sitemap is a snapshot: every commissionaire who registers after
 * a deploy is missing from it, which quietly withholds exactly the pages this
 * feature exists to get indexed. It also made the build depend on a reachable
 * database.
 */
export const dynamic = "force-dynamic";

const BASE_URL = "https://igura-rw.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/rent/houses`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/plots`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/sell/houses`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/locations`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/saved`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  // Agent profiles are the intended organic entry point for the "commissionaire
  // + WhatsApp" sharing loop, so they belong in the sitemap.
  //
  // Deliberately unfiltered and filtered in JS: a `not: null` / relation
  // predicate here silently matched nothing, and an empty agent list is the
  // exact failure this is supposed to prevent, so it must not be swallowed.
  let agentPages: MetadataRoute.Sitemap = [];
  try {
    const profiles = await prisma.profile.findMany({
      select: { slug: true, updatedAt: true, user: { select: { isActive: true } } },
      orderBy: { slug: "asc" },
      take: 2000,
    });
    agentPages = profiles
      .filter((p) => !!p.slug && p.user.isActive)
      .map((p) => ({
        url: `${BASE_URL}/agent/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch (error) {
    // Logged rather than swallowed: a silent empty list here means agent
    // profiles quietly drop out of search results with no signal.
    console.error("Sitemap: could not build agent profile entries:", error);
  }

  return [...staticPages, ...agentPages];
}
