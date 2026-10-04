import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PublicProfile, PublicProfileListing, PublicProfileOwner } from "@/components/public-profile";

interface Props {
  params: Promise<{ slug: string }>;
}

/** Reads only public columns. No contact details are selected at any point. */
async function loadProfile(userId: string) {
  const owner = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      profile: { select: { bio: true, district: true, slug: true } },
    },
  });
  if (!owner) return null;

  const [listings, membership] = await Promise.all([
    prisma.property.findMany({
      where: { ownerId: userId, status: "ACTIVE" },
      select: {
        id: true, slug: true, title: true, price: true, negotiable: true,
        availabilityStatus: true, availabilityDate: true,
        locationDistrict: true, locationSector: true,
        bedrooms: true, bathrooms: true, areaValue: true, areaUnit: true,
        videoUrl: true, createdAt: true, ownerId: true,
        marketplace: { select: { name: true, displayName: true } },
        propertyType: { select: { displayName: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membership.findFirst({
      where: { userId, status: "ACTIVE" },
      select: { expiresAt: true, plan: { select: { displayName: true } } },
    }),
  ]);

  const verified = !!membership && (!membership.expiresAt || membership.expiresAt > new Date());
  return { owner, listings, verified, planName: membership?.plan.displayName ?? null };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const profile = await prisma.profile.findFirst({
    where: { slug: slug.toLowerCase() },
    select: { user: { select: { firstName: true, lastName: true, isActive: true, profile: { select: { district: true } } } } },
  });

  if (!profile?.user.isActive) {
    return { title: "Profile not found | Igura" };
  }

  const name = `${profile.user.firstName} ${profile.user.lastName}`.trim();
  const where = profile.user.profile?.district ? ` in ${profile.user.profile.district}` : "";
  return {
    title: `${name} — property listings on Igura`,
    description: `Browse ${name}'s houses for rent and plots for sale${where} on Igura, Rwanda's property marketplace. Contact details on every listing.`,
    openGraph: {
      title: `${name} — property listings on Igura`,
      description: `Houses and plots${where} from ${name} on Igura.`,
      type: "profile" as const,
    },
  };
}

export default async function AgentProfilePage({ params }: Props) {
  const { slug } = await params;
  const normalised = slug.toLowerCase();

  const profile = await prisma.profile.findFirst({
    where: { slug: normalised },
    select: { userId: true },
  });
  if (!profile) notFound();

  const data = await loadProfile(profile.userId);
  if (!data) notFound();

  return (
    <PublicProfile
      owner={data.owner as PublicProfileOwner}
      listings={data.listings as unknown as PublicProfileListing[]}
      verified={data.verified}
      membershipName={data.planName}
      slug={data.owner.profile?.slug ?? normalised}
    />
  );
}
