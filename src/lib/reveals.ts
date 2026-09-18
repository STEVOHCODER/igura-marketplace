import { prisma } from "@/lib/prisma";
import { REVEAL_FEE_RWF } from "@/lib/access";
import { notify } from "@/lib/notify";

/**
 * Records a paid contact reveal and notifies both sides.
 *
 * Shared by the redirect callback and the provider webhook so a buyer who
 * closes the tab mid-redirect still receives what they paid for. Idempotent —
 * the unique index on (userId, propertyId) makes a repeat call a no-op.
 */
export async function grantReveal(params: {
  userId: string;
  propertyId: string;
  paymentId: string;
  transactionId?: string;
}): Promise<boolean> {
  const { userId, propertyId, paymentId, transactionId } = params;

  try {
    await prisma.contactReveal.create({
      data: { userId, propertyId, paymentId, amount: REVEAL_FEE_RWF },
    });
  } catch {
    return false; // Already granted.
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "SUCCESSFUL",
      paidAt: new Date(),
      ...(transactionId ? { providerTransactionId: transactionId } : {}),
    },
  });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { title: true, ownerId: true, slug: true },
  });

  if (!property) return true;

  await notify({
    userId,
    type: "CONTACT_REVEALED",
    title: "Contact unlocked",
    message: `You can now see the owner's phone number for "${property.title}".`,
    metadata: { propertyId, slug: property.slug },
  });

  await notify({
    userId: property.ownerId,
    type: "CONTACT_PURCHASED",
    title: "Someone unlocked your contact",
    message: `A buyer paid to see your phone number for "${property.title}". Expect a call soon.`,
    metadata: { propertyId, slug: property.slug },
  });

  return true;
}
