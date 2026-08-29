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
