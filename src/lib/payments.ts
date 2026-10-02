/**
 * Payment-granting helpers shared by the webhook and the verify route.
 *
 * Both paths must apply the exact same rules — confirm the settled amount and
 * currency before granting anything, and always stamp a 30-day expiry. Keeping
 * this in one module prevents the two routes from drifting apart again
 * (the verify route previously granted lifetime memberships and skipped the
 * amount check entirely).
 */

/** Membership term granted on a successful plan payment. */
export const MEMBERSHIP_DAYS = 30;

/** Result shape passed straight into `prisma.membership.update({ data })`. */
export interface MembershipGrant {
  status: "ACTIVE";
  activatedAt: Date;
  expiresAt: Date;
}

/**
 * Decides whether a settled transaction may activate a membership, and if so
 * returns the update payload including the expiry.
 *
 * The amount and currency reported by the provider are confirmed against the
 * amount we recorded when the payment was created. A short-paid or
 * wrong-currency transaction must not unlock anything, and a provider that
 * reports no amount at all is treated as unconfirmed rather than trusted.
 *
 * Returns `null` when the transaction must not grant — the caller should mark
 * the payment FAILED and not touch the membership.
 */
export function buildMembershipGrant(args: {
  paymentAmount: number;
  paymentCurrency: string;
  settledAmount: number | null | undefined;
  settledCurrency: string | null | undefined;
}): MembershipGrant | null {
  const { paymentAmount, paymentCurrency, settledAmount, settledCurrency } = args;

  // A missing amount means we could not confirm the value actually settled.
  if (settledAmount == null || !Number.isFinite(settledAmount)) return null;

  if (settledAmount < paymentAmount) return null;
  if (settledCurrency && settledCurrency !== paymentCurrency) return null;

  const activatedAt = new Date();
  const expiresAt = new Date(activatedAt);
  expiresAt.setDate(expiresAt.getDate() + MEMBERSHIP_DAYS);

  return { status: "ACTIVE", activatedAt, expiresAt };
}

/** Strict allowlist a payment reference must match before it touches a URL. */
const SAFE_REFERENCE = /^[\w-]{1,100}$/;

/**
 * A payment reference is interpolated into the provider's verification URL.
 * Only word characters and dashes are allowed, so a reference can never carry
 * `&`, `#`, `%`, `/`, or whitespace into that request.
 */
export function isSafePaymentReference(reference: string): boolean {
  return typeof reference === "string" && SAFE_REFERENCE.test(reference);
}
