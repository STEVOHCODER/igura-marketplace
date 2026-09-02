import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payment-provider";
import { getTokenFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const session = await getTokenFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { propertyId, method } = body;

  if (!propertyId) {
    return NextResponse.json({ error: "Property ID required" }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owner: { select: { email: true, firstName: true, lastName: true, phone: true } }, marketplace: true },
  });

  if (!property) {
    return NextResponse.json({ error: "Property not found" }, { status: 404 });
  }

  if (property.contactRevealed) {
    return NextResponse.json({ error: "Contact already revealed", phone: property.contactPhone, contactName: property.contactName });
  }

  const paymentMethod = method === "mobile_money" ? "MOBILE_MONEY" : method === "bank_card" ? "BANK_CARD" : "MOBILE_MONEY";
  const reference = `reveal-${propertyId.slice(-8)}-${Date.now()}`;

  const fallbackPlan = await prisma.plan.findFirst({ where: { marketplaceId: property.marketplaceId } });

  const payment = await prisma.payment.create({
    data: {
      userId: session.userId,
      planId: fallbackPlan?.id || "",
      amount: 2000,
      provider: "flutterwave",
      reference,
      status: "PENDING",
      method: paymentMethod,
      metadata: { type: "phone_reveal", propertyId, ownerId: property.ownerId },
    },
  });

  const provider = getPaymentProvider();
  const result = await provider.initiatePayment({
    amount: 2000,
    currency: "RWF",
    reference,
    email: property.owner.email,
    phone: property.owner.phone || undefined,
    name: `${property.owner.firstName} ${property.owner.lastName}`,
    method: paymentMethod === "MOBILE_MONEY" ? "mobile_money" : "bank_card",
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback?ref=${reference}&type=reveal&propertyId=${propertyId}`,
  });

  if (result.success && result.checkoutUrl) {
    return NextResponse.json({ success: true, checkoutUrl: result.checkoutUrl, reference });
  }

  return NextResponse.json({ error: result.message || "Payment initiation failed" }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");
  const propertyId = searchParams.get("propertyId");

  if (!reference || !propertyId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const result = await provider.verifyPayment(reference);

  if (result.status === "SUCCESSFUL") {
    await prisma.property.update({
      where: { id: propertyId },
      data: { contactRevealed: true },
    });

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { contactPhone: true, contactName: true },
    });

    return NextResponse.json({ success: true, revealed: true, phone: property?.contactPhone, contactName: property?.contactName });
  }

  return NextResponse.json({ success: false, revealed: false, status: result.status });
}
