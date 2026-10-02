import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, getProviderName } from "@/lib/payment-provider";
import { getTokenFromRequestVerified } from "@/lib/auth";
import { hasRevealedContact, REVEAL_FEE_RWF } from "@/lib/access";
import { enforceRateLimit, LIMITS } from "@/lib/rate-limit";
import { grantReveal } from "@/lib/reveals";
import { isPendingFresh, sweepStalePending } from "@/lib/pending-payments";
import { isPaymentsEnabled } from "@/lib/monetization";

/**
 * Starts a contact-reveal purchase.
 *
 * Two things changed from the original implementation:
 *  1. The checkout is created for the *buyer*, not the property owner. It used
 *     to send the owner's email/phone/name to the provider, so the person
 *     paying saw someone else's identity prefilled at checkout.
 *  2. Access is granted per (user, property) via ContactReveal rather than by
 *     flipping a global `Property.contactRevealed` flag, which made one
 *     person's 2,000 RWF unlock the number for every visitor forever.
 */
export async function POST(request: NextRequest) {
  const session = await getTokenFromRequestVerified(request);
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to reveal the owner's contact." },
      { status: 401 }
    );
  }

  const limited = enforceRateLimit(
    request,
    "reveal",
    LIMITS.payment.limit,
    LIMITS.payment.windowMs,
    session.userId
  );
  if (limited) return limited;

  let body: { propertyId?: string; method?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { propertyId, method, phone } = body;

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  // Quicko moves mobile money only. Fail fast with a message the UI can show
  // instead of sending a card charge at a provider that cannot take it.
  if (getProviderName() === "quicko" && method && method !== "mobile_money") {
    return NextResponse.json(
      { error: "Card payments are not available. Please choose Mobile Money." },
      { status: 400 }
    );
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      ownerId: true,
      marketplaceId: true,
      contactPhone: true,
      contactName: true,
      status: true,
      title: true,
    },
  });

  if (!property || property.status !== "ACTIVE") {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  // Already paid (or owner/admin) — hand the number over without charging again.
  const alreadyRevealed = await hasRevealedContact(
    session.userId,
    property.id,
    property.ownerId,
    session.role
  );

  if (alreadyRevealed) {
    return NextResponse.json({
      success: true,
      revealed: true,
      phone: property.contactPhone,
      contactName: property.contactName,
    });
  }

  if (!isPaymentsEnabled()) {
    await grantReveal({
      userId: session.userId,
      propertyId: property.id,
    });
    return NextResponse.json({
      success: true,
      revealed: true,
      free: true,
      phone: property.contactPhone,
      contactName: property.contactName,
    });
  }

  const buyer = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, phone: true, firstName: true, lastName: true },
  });

  if (!buyer) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const paymentMethod =
    method === "bank_card" ? "BANK_CARD" : method === "bank_transfer" ? "BANK_TRANSFER" : "MOBILE_MONEY";
  const reference = `reveal-${property.id.slice(-8)}-${session.userId.slice(-6)}-${Date.now()}`;

  // `planId` is required by the Payment model but a reveal is not a plan
  // purchase. Fall back to any plan on the marketplace; if there is none, use
  // the marketplace's first plan overall rather than writing an empty string,
  // which used to throw an ObjectId cast error.
  const fallbackPlan =
    (await prisma.plan.findFirst({ where: { marketplaceId: property.marketplaceId } })) ??
    (await prisma.plan.findFirst());

  if (!fallbackPlan) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Please try again later." },
      { status: 503 }
    );
  }

  await sweepStalePending();

  // Same no-resubmit rule as memberships: a click while an attempt is still
  // live hands back the existing prompt instead of firing a second one.
  const candidates = await prisma.payment.findMany({
    where: { userId: session.userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const liveAttempt = candidates.find(
    (p) =>
      (p.metadata as Record<string, unknown> | null)?.type === "phone_reveal" &&
      (p.metadata as Record<string, unknown> | null)?.propertyId === property.id
  );

  if (liveAttempt && isPendingFresh(liveAttempt.createdAt)) {
    const provider = getPaymentProvider();
    const check = await provider.verifyPayment(
      liveAttempt.reference || `reveal-${liveAttempt.id}`,
      liveAttempt.providerTransactionId || undefined
    );

    if (check.status === "FAILED" || check.status === "CANCELLED") {
      await prisma.payment.update({
        where: { id: liveAttempt.id },
        data: { status: check.status as any },
      });
    } else {
      return NextResponse.json({
        success: true,
        pending: true,
        reference: liveAttempt.reference,
        message:
          "A payment request is already active on your number. Approve it on your phone, then check its status.",
      });
    }
  } else if (liveAttempt) {
    await prisma.payment.update({
      where: { id: liveAttempt.id },
      data: { status: "CANCELLED" },
    });
  }

  const payment = await prisma.payment.create({
    data: {
      userId: session.userId,
      planId: fallbackPlan.id,
      amount: REVEAL_FEE_RWF,
      provider: getProviderName(),
      reference,
      status: "PENDING",
      method: paymentMethod,
      metadata: {
        type: "phone_reveal",
        propertyId: property.id,
        ownerId: property.ownerId,
        buyerId: session.userId,
      },
    },
  });

  const provider = getPaymentProvider();
  const payerPhone = typeof phone === "string" && phone.trim() ? phone.trim() : buyer.phone || undefined;
  const result = await provider.initiatePayment({
    amount: REVEAL_FEE_RWF,
    currency: "RWF",
    reference,
    email: buyer.email,
    phone: payerPhone,
    name: `${buyer.firstName} ${buyer.lastName}`,
    method:
      paymentMethod === "MOBILE_MONEY"
        ? "mobile_money"
        : paymentMethod === "BANK_CARD"
          ? "bank_card"
          : "bank_transfer",
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback?ref=${reference}&type=reveal&propertyId=${property.id}`,
  });

  if (result.success && result.checkoutUrl) {
    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl, reference });
  }

  // Quicko Request to Pay: the prompt is live on the buyer's handset.
  // PENDING also covers unclear provider answers — keep open for a check.
  if (result.status === "PENDING") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTransactionId: result.transactionId || null },
    });
    return NextResponse.json({
      success: true,
      pending: true,
      reference,
      message: result.message,
    });
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", metadata: { ...(payment.metadata as object), error: result.message } },
  });

  return NextResponse.json(
    { error: result.message || "Payment initiation failed" },
    { status: 400 }
  );
}

/**
 * Confirms a reveal after the provider redirect.
 *
 * Verifies with the provider, checks the settled amount and that the payment
 * belongs to the caller, then records the grant. Idempotent: re-hitting the
 * callback will not double-charge or duplicate the grant.
 */
export async function GET(request: NextRequest) {
  const session = await getTokenFromRequestVerified(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  const propertyId = searchParams.get("propertyId");

  if (!reference || !propertyId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({ where: { reference } });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // A reference is guessable enough that we must not let one user confirm
  // another user's payment into their own account.
  if (payment.userId !== session.userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const existing = await prisma.contactReveal.findFirst({
    where: { userId: session.userId, propertyId },
  });

  if (existing) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { contactPhone: true, contactName: true },
    });
    return NextResponse.json({
      success: true,
      revealed: true,
      phone: property?.contactPhone,
      contactName: property?.contactName,
    });
  }

  const provider = getPaymentProvider();
  const result = await provider.verifyPayment(reference, payment.providerTransactionId || undefined);

  // Verify exact amount match (not just >=) to prevent partial payment exploits
  const amountOk = result.amount === REVEAL_FEE_RWF;
  const currencyOk = !result.currency || result.currency === "RWF";

  // Validate propertyId matches the payment metadata
  const meta = payment.metadata as Record<string, unknown> | null;
  const propertyIdMatches = !meta || meta.propertyId === propertyId;

  if (result.status !== "SUCCESSFUL" || !amountOk || !currencyOk || !propertyIdMatches) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: result.status === "SUCCESSFUL" ? "FAILED" : (result.status as any) },
    });
    return NextResponse.json({
      success: false,
      revealed: false,
      status: result.status,
      error: !propertyIdMatches
        ? "Property ID does not match payment record."
        : !amountOk || !currencyOk
          ? "Payment amount did not match the reveal fee."
          : undefined,
    });
  }

  await grantReveal({
    userId: session.userId,
    propertyId,
    paymentId: payment.id,
    transactionId: result.transactionId,
  });

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { contactPhone: true, contactName: true },
  });

  return NextResponse.json({
    success: true,
    revealed: true,
    phone: property?.contactPhone,
    contactName: property?.contactName,
  });
}
