import { randomUUID, timingSafeEqual } from "crypto";
import { isSafePaymentReference } from "@/lib/payments";
import {
  createQuickoPayment,
  getQuickoConfig,
  getQuickoTransaction,
  mapQuickoStatus,
  normalizeQuickoPayer,
} from "@/lib/quicko";

/** Constant-time compare that tolerates length mismatch without throwing. */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export interface PaymentInitiation {
  amount: number;
  currency: string;
  reference: string;
  email: string;
  phone?: string;
  name?: string;
  method: "mobile_money" | "bank_card" | "bank_transfer";
  redirectUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  reference: string;
  checkoutUrl?: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "CANCELLED";
  message?: string;
  /** Amount the provider actually settled — callers must check this against
   *  the amount they expected before granting anything. */
  amount?: number;
  currency?: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  reference: string;
  amount: number;
  currency: string;
  status: "successful" | "failed" | "cancelled" | "pending";
  transactionId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface PaymentProvider {
  initiatePayment(data: PaymentInitiation): Promise<PaymentResult>;
  /**
   * Confirms a payment with the provider.
   *
   * `reference` is our own reference (IGURA-... / reveal-...). MTN looks
   * transactions up by the X-Reference-Id UUID it was given at initiation,
   * which we store in Payment.providerTransactionId — pass it as
   * `transactionId`. Flutterwave ignores the second argument.
   */
  verifyPayment(reference: string, transactionId?: string): Promise<PaymentResult>;
  handleWebhook(payload: unknown, signature: string): WebhookEvent | null;
}

/** Which provider the routes should use. "quicko" unless explicitly set back. */
export function getProviderName(): "quicko" | "flutterwave" {
  return (process.env.PAYMENTS_PROVIDER || "quicko").toLowerCase() === "flutterwave"
    ? "flutterwave"
    : "quicko";
}

class FlutterwaveProvider implements PaymentProvider {
  private secretKey: string;
  private publicKey: string;
  private encryptionKey: string;
  private baseUrl = "https://api.flutterwave.com/v3";

  constructor() {
    this.secretKey = (process.env.FLUTTERWAVE_SECRET_KEY || "").trim();
    this.publicKey = (process.env.FLUTTERWAVE_PUBLIC_KEY || "").trim();
    this.encryptionKey = (process.env.FLUTTERWAVE_ENCRYPTION_KEY || "").trim();
  }

  /**
   * Flutterwave returns 401 for a missing or revoked key, which previously
   * surfaced as an opaque 502 with the provider's own message. Fail earlier
   * with something that names the missing env var, so a misconfigured deploy
   * is obvious instead of looking like a bug in the app.
   */
  private requireKeys(operation: string): PaymentResult | null {
    if (this.secretKey) return null;
    console.error(
      `[payments] ${operation} refused: FLUTTERWAVE_SECRET_KEY is not set on this deploy. Paste the live key from the Flutterwave dashboard into the Vercel environment variables.`
    );
    return {
      success: false,
      reference: "",
      status: "FAILED",
      message: "Payment provider is not configured. Please contact support.",
    };
  }

  async initiatePayment(data: PaymentInitiation): Promise<PaymentResult> {
    const blocked = this.requireKeys("initiatePayment");
    if (blocked) {
      return { ...blocked, reference: data.reference };
    }

    const response = await fetch(`${this.baseUrl}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: data.reference,
        amount: data.amount,
        currency: data.currency,
        redirect_url: data.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        customer: {
          email: data.email,
          phone_number: data.phone,
          name: data.name,
        },
        customizations: {
          title: "Igura Marketplace",
          description: `Payment for marketplace access`,
        },
        meta: {
          reference: data.reference,
        },
      }),
    });

    const result = await response.json();

    if (result.status === "success") {
      return {
        success: true,
        reference: data.reference,
        checkoutUrl: result.data?.link,
        status: "PENDING",
        transactionId: result.data?.id?.toString(),
      };
    }

    return {
      success: false,
      reference: data.reference,
      status: "FAILED",
      message: result.message || "Payment initiation failed",
    };
  }

  async verifyPayment(reference: string): Promise<PaymentResult> {
    // Reject anything outside the strict allowlist before it can reach the
    // network — the reference is user-controlled and used to be interpolated
    // raw into this URL.
    if (!isSafePaymentReference(reference)) {
      return {
        success: false,
        reference,
        status: "FAILED",
        message: "Invalid payment reference",
      };
    }

    const blocked = this.requireKeys("verifyPayment");
    if (blocked) {
      return { ...blocked, reference };
    }

    const url = new URL(`${this.baseUrl}/transactions/verify_by_reference`);
    url.searchParams.set("tx_ref", reference);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
      },
    });

    const result = await response.json();

    if (result.status === "success" && result.data) {
      const status =
        result.data.status === "successful" ? "SUCCESSFUL" :
        result.data.status === "failed" ? "FAILED" :
        result.data.status === "cancelled" ? "CANCELLED" : "PENDING";

      return {
        success: status === "SUCCESSFUL",
        reference,
        status,
        transactionId: result.data.id?.toString(),
        amount: typeof result.data.amount === "number" ? result.data.amount : Number(result.data.amount),
        currency: result.data.currency,
      };
    }

    return {
      success: false,
      reference,
      status: "FAILED",
      message: "Verification failed",
    };
  }

  handleWebhook(payload: any, signature: string): WebhookEvent | null {
    // The signature argument used to be accepted and ignored, so anyone who
    // could reach the endpoint could POST {status:"successful"} and activate a
    // membership or unlock a phone number for free. Flutterwave sends the
    // configured secret hash verbatim in `verif-hash`, so compare it in
    // constant time and reject anything that does not match.
    const expected = process.env.FLUTTERWAVE_WEBHOOK_SECRET || "";

    if (!expected) {
      console.error(
        "[payments] FLUTTERWAVE_WEBHOOK_SECRET is not set — rejecting webhook. Set it to the secret hash configured in the Flutterwave dashboard."
      );
      return null;
    }

    if (!signature || !safeCompare(signature, expected)) {
      console.warn("[payments] Rejected webhook with invalid signature.");
      return null;
    }

    if (!payload || payload.status !== "successful" && payload.status !== "failed" && payload.status !== "cancelled" && payload.status !== "pending") {
      return null;
    }

    return {
      id: payload.id?.toString() || "",
      type: payload.event || "charge.completed",
      reference: payload.tx_ref,
      amount: payload.amount,
      currency: payload.currency,
      status: payload.status,
      transactionId: payload.flw_ref || payload.id?.toString() || "",
      metadata: payload.meta,
      timestamp: new Date().toISOString(),
    };
  }
}

const flutterwaveProvider = new FlutterwaveProvider();

/**
 * Quicko Collections (routes to MTN MoMo behind the scenes).
 *
 * Same interaction shape as the old MTN-direct provider: no checkout link —
 * the payer approves with their MoMo PIN on their own phone after the
 * request is accepted. initiatePayment returns success + PENDING and the
 * caller tells the user to approve, then confirms via verifyPayment.
 * Quicko implements no merchant webhooks, so polling is the only
 * confirmation path. Quicko only moves mobile money.
 */
class QuickoProvider implements PaymentProvider {
  async initiatePayment(data: PaymentInitiation): Promise<PaymentResult> {
    if (data.method !== "mobile_money") {
      return {
        success: false,
        reference: data.reference,
        status: "FAILED",
        message: "Card and bank payments are not available. Please choose Mobile Money.",
      };
    }

    const cfg = getQuickoConfig();
    if (!cfg.ok) {
      console.error(`[payments] initiatePayment refused: missing ${cfg.missing.join(", ")}.`);
      return {
        success: false,
        reference: data.reference,
        status: "FAILED",
        message: "Mobile Money payments are not configured yet. Please contact support.",
      };
    }

    // Quicko wants exactly 10 local digits, sent to the provider unchanged.
    const payerIdentifier = normalizeQuickoPayer(data.phone);
    if (!payerIdentifier) {
      return {
        success: false,
        reference: data.reference,
        status: "FAILED",
        message: "Enter a valid MTN MoMo number, e.g. 0788123456.",
      };
    }

    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      return {
        success: false,
        reference: data.reference,
        status: "FAILED",
        message: "Invalid payment amount.",
      };
    }

    const referenceId = randomUUID();
    const currency = data.currency || "RWF";

    const result = await createQuickoPayment(cfg.config, {
      amount: data.amount,
      currency,
      providerReference: data.reference,
      payerIdentifier,
      payerMessage: `Igura payment ${data.reference}`,
      payeeNote: `Igura ${data.reference}`,
      referenceId,
    });

    if (!result.ok) {
      // Unknown outcome (429/5xx/transport): Quicko may still have created
      // the collection, so hand back PENDING with the UUID we sent — the
      // caller keeps the payment open for a status check instead of
      // marking it FAILED. Definite rejections (400 validation, 401) fail.
      if (result.unknownOutcome) {
        return {
          success: false,
          reference: data.reference,
          status: "PENDING",
          transactionId: referenceId,
          message: result.message,
        };
      }
      return { success: false, reference: data.reference, status: "FAILED", message: result.message };
    }

    return {
      success: true,
      reference: data.reference,
      status: "PENDING",
      transactionId: result.collection.referenceId || referenceId,
      message: `Payment request sent to ${payerIdentifier}. Enter your MoMo PIN on your phone to approve.`,
    };
  }

  async verifyPayment(reference: string, transactionId?: string): Promise<PaymentResult> {
    if (!isSafePaymentReference(reference)) {
      return { success: false, reference, status: "FAILED", message: "Invalid payment reference" };
    }

    // Without Quicko's lookup id (the referenceId UUID from initiation) we
    // cannot ask Quicko anything. Report PENDING (not FAILED) so callers
    // that only act on status *changes* leave the payment alone instead of
    // killing a live transaction.
    if (!transactionId) {
      return {
        success: false,
        reference,
        status: "PENDING",
        message: "Payment has no provider transaction to check yet.",
      };
    }

    const cfg = getQuickoConfig();
    if (!cfg.ok) {
      console.error(`[payments] verifyPayment refused: missing ${cfg.missing.join(", ")}.`);
      return { success: false, reference, status: "PENDING", message: "Payment provider is not configured." };
    }

    const result = await getQuickoTransaction(cfg.config, transactionId);

    if (!result.ok) {
      // A lookup miss (422) means Quicko has no such transaction — treat as
      // still pending rather than failed; the payer may simply not have
      // acted yet, and a retry must stay possible.
      return {
        success: false,
        reference,
        status: "PENDING",
        transactionId,
        message: result.message,
      };
    }

    const tx = result.collection;
    const status = mapQuickoStatus(tx.status);
    const amount = typeof tx.amount === "number" ? tx.amount : Number(tx.amount);
    return {
      success: status === "SUCCESSFUL",
      reference,
      status,
      transactionId,
      amount: Number.isFinite(amount) ? amount : undefined,
      currency: tx.currency,
    };
  }

  handleWebhook(_payload: unknown, _signature: string): WebhookEvent | null {
    // Quicko implements no merchant webhooks: confirmation is poll-only via
    // verifyPayment. Returning null keeps the Flutterwave handler from ever
    // misreading a foreign body while Quicko is the active provider.
    return null;
  }
}

const quickoProvider = new QuickoProvider();

export function getPaymentProvider(): PaymentProvider {
  return getProviderName() === "flutterwave" ? flutterwaveProvider : quickoProvider;
}
