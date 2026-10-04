import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assignProfileSlug } from "@/lib/profile-slug";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Legacy owner URL, kept so links already shared still resolve.
 *
 * Redirects to the canonical /agent/[slug] form. Permanent, because the slug is
 * now the durable identifier: anyone who bookmarked /owners/<objectid> should
 * end up somewhere stable and readable rather than on a page that could
 * disappear with a refactor.
 *
 * Assigns a slug on the way through if the user somehow has none, so the
 * redirect always has a destination.
 */
export default async function OwnerRedirect({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) notFound();

  const owner = await prisma.user.findUnique({
    where: { id },
    select: { id: true, firstName: true, lastName: true, isActive: true, profile: { select: { slug: true } } },
  });
  if (!owner || !owner.isActive) notFound();

  const slug = owner.profile?.slug || (await assignProfileSlug(owner.id, owner.firstName, owner.lastName));

  redirect(`/agent/${slug}`);
}
