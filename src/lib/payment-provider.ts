import { timingSafeEqual } from "crypto";

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
  verifyPayment(reference: string): Promise<PaymentResult>;
  handleWebhook(payload: unknown, signature: string): WebhookEvent | null;
}

class FlutterwaveProvider implements PaymentProvider {
  private secretKey: string;
  private publicKey: string;
  private encryptionKey: string;
  private baseUrl = "https://api.flutterwave.com/v3";

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || "";
    this.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || "";
    this.encryptionKey = process.env.FLUTTERWAVE_ENCRYPTION_KEY || "";
  }

  async initiatePayment(data: PaymentInitiation): Promise<PaymentResult> {
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
    const response = await fetch(
      `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      }
    );

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
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";

    if (!expected) {
      console.error(
        "[payments] FLUTTERWAVE_WEBHOOK_HASH is not set — rejecting webhook. Set it to the secret hash configured in the Flutterwave dashboard."
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

export function getPaymentProvider(): PaymentProvider {
  return flutterwaveProvider;
}
