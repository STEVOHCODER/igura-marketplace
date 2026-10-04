/*
 * One-off backfill: give every existing user a public profile slug.
 *
 * Signups and admin-created accounts assign a slug at creation time, but
 * accounts that predate this feature have none, and without a slug they have no
 * shareable profile page. Idempotent - users who already have a slug are
 * skipped - so it is safe to run more than once.
 *
 *   npx tsx scripts/backfill-profile-slugs.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { prisma } = await import("../src/lib/prisma");
const { assignProfileSlug } = await import("../src/lib/profile-slug");

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      profile: { select: { slug: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  let created = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const u of users) {
    if (u.profile?.slug) {
      skipped++;
      continue;
    }
    try {
      const slug = await assignProfileSlug(u.id, u.firstName, u.lastName);
      created++;
      console.log(`  ${u.firstName} ${u.lastName} <${u.email}> -> /agent/${slug}`);
    } catch (e: any) {
      failures.push(`${u.email}: ${e?.message || e}`);
      console.error(`  FAILED ${u.email}:`, e?.message || e);
    }
  }

  // Uniqueness is the whole point of this feature, so prove it rather than
  // assume it.
  const dupes = await prisma.profile.groupBy({
    by: ["slug"],
    having: { slug: { _count: { gt: 1 } } },
  });
  const nulls = await prisma.user.count({ where: { profile: { slug: null } } });

  console.log(`\ncreated=${created} skipped=${skipped} failures=${failures.length}`);
  console.log(`duplicate slugs: ${dupes.length}`);
  console.log(`users still without a slug: ${nulls}`);

  await prisma.$disconnect();
  if (failures.length > 0 || dupes.length > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error("Backfill failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
