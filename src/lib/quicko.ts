/**
 * Quicko merchant client (pay.quicko.rw) — Collections.
 *
 * Quicko routes to MTN MoMo behind the scenes. Spec was extracted from the
 * published docs bundle (pay.quicko.rw/docs), whose exact wording is quoted
 * below where it constrains behaviour:
 *
 * - Auth: "API key + API ID, or Bearer access token." Keys "have the format
 *   ccore_live_ or ccore_test_ followed by 43 URL-safe characters. Always
 *   send the associated uppercase UUID API ID." In practice:
 *   X-API-Key: <key> + X-API-ID: <UPPERCASE-UUID>.
 *   ("Check API key and uppercase API ID" is the documented 401 fix.)
 * - POST /api/colection/initialize-payment (the route intentionally spells
 *   colection with one l). "Only MTN_MOMO is implemented. Other accepted
 *   provider values can return success with no data, and do not create a
 *   payment." "No callbackUrl, metadata or idempotency header is supported.
 *   Unknown body fields are stripped."
 * - payerIdentifier: "Exactly 10 characters for MOBILE_MONEY. Use a local
 *   mobile number", "sent ... to the provider unchanged."
 * - referenceId: "Generated if omitted. Supply a new UUID: status lookup
 *   requires UUID format. Unique, but duplicates are not replayed."
 * - GET /api/colection/transaction/:referenceId — "referenceId must be a
 *   UUID. This is not the collection id or externalId." Missing payment:
 *   422 BUSINESS_RULE_ERROR "There is not Transaction Available here."
 * - "Merchant-facing HTTP webhook delivery is not implemented." There are
 *   no callbacks: confirmation is poll-the-status only.
 * - Transaction statuses: PENDING, PROCESSING, SUCCESS, SUCCESSFUL, FAILED,
 *   CANCELLED, REVERSED, REFUNDED.
 *
 * Env (never committed):
 *   QUICKO_BASE_URL  default https://pay.quicko.rw
 *   QUICKO_API_KEY   ccore_live_... (43 URL-safe chars after the prefix)
 *   QUICKO_API_ID    associated UUID, uppercased at use
 */

export interface QuickoConfig {
  baseUrl: string;
  apiKey: string;
  apiId: string;
}

export type QuickoConfigResult =
  | { ok: true; config: QuickoConfig }
  | { ok: false; missing: string[] };

export function getQuickoConfig(): QuickoConfigResult {
  const baseUrl = (process.env.QUICKO_BASE_URL || "https://pay.quicko.rw").replace(/\/+$/, "");
  const apiKey = (process.env.QUICKO_API_KEY || "").trim();
  const apiId = (process.env.QUICKO_API_ID || "").trim().toUpperCase();

  const missing: string[] = [];
  if (!apiKey) missing.push("QUICKO_API_KEY");
  if (!apiId) missing.push("QUICKO_API_ID");
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, config: { baseUrl, apiKey, apiId } };
}

/**
 * Normalises a payer number to Quicko's 10-digit local format (07XXXXXXXX).
 * Accepts 07XXXXXXXX, 2507XXXXXXXX, +2507XXXXXXXX with spaces/dashes.
 * Returns null when the input cannot be a Rwandan mobile number.
 */
export function normalizeQuickoPayer(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (/^07\d{8}$/.test(digits)) return digits;
  if (/^2507\d{8}$/.test(digits)) return "0" + digits.slice(3);
  return null;
}

/** Internal PENDING/SUCCESSFUL/FAILED from a Quicko transaction status. */
export function mapQuickoStatus(status: unknown): "SUCCESSFUL" | "FAILED" | "PENDING" {
  const s = typeof status === "string" ? status.toUpperCase() : "";
  if (s === "SUCCESS" || s === "SUCCESSFUL") return "SUCCESSFUL";
  if (s === "FAILED" || s === "CANCELLED") return "FAILED";
  // REVERSED / REFUNDED mean the money came back: must never read as paid.
  if (s === "REVERSED" || s === "REFUNDED") return "FAILED";
  return "PENDING";
}

function quickoHeaders(config: QuickoConfig): Record<string, string> {
  return {
    "X-API-Key": config.apiKey,
    "X-API-ID": config.apiId,
    "Content-Type": "application/json",
  };
}

async function readJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(data: any, fallback: string): string {
  const details = data?.error?.details?.fieldErrors;
  if (details && typeof details === "object") {
    const first = Object.entries(details)
      .flatMap(([field, msgs]) => (Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : []))
      .slice(0, 2)
      .join("; ");
    if (first) return first;
  }
  const message = data?.error?.message || data?.message;
  if (typeof message === "string" && message) return message;
  return fallback;
}

/**
 * Per the Quicko error contract, an unknown outcome is not proof of
 * failure: 429 (rate limited), 5xx (internal/database, or an upstream
 * provider 5xx surfaced as 502) and transport errors mean Quicko may still
 * have created the collection. Callers must keep the payment PENDING and
 * reconcile via status check — never flip it to FAILED on these.
 */
export function isUnknownOutcomeStatus(httpStatus: number): boolean {
  return httpStatus === 0 || httpStatus === 429 || (httpStatus >= 500 && httpStatus <= 599);
}

function requestIdOf(data: any): string {
  return typeof data?.requestId === "string" ? data.requestId : "(no requestId)";
}

export interface QuickoCreateArgs {
  amount: number;
  currency: string;
  providerReference: string;
  payerIdentifier: string;
  payerMessage: string;
  payeeNote: string;
  referenceId: string;
}

export interface QuickoCollection {
  id?: string;
  referenceId?: string;
  externalId?: string;
  providerReference?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  raw: unknown;
}

export async function createQuickoPayment(
  config: QuickoConfig,
  args: QuickoCreateArgs
): Promise<
  | { ok: true; collection: QuickoCollection }
  | { ok: false; status: number; message: string; unknownOutcome: boolean }
> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/colection/initialize-payment`, {
      method: "POST",
      headers: quickoHeaders(config),
      body: JSON.stringify({
        amount: args.amount,
        currency: args.currency,
        provider: "MTN_MOMO",
        providerReference: args.providerReference,
        paymentMethod: "MOBILE_MONEY",
        payerType: "MSISDN",
        collectionType: "COLLECTION",
        payerIdentifier: args.payerIdentifier,
        payerMessage: args.payerMessage.slice(0, 160),
        payeeNote: args.payeeNote.slice(0, 160),
        referenceId: args.referenceId,
        status: "PENDING",
      }),
    });
  } catch (error) {
    console.error("[quicko] create payment transport error:", error);
    return {
      ok: false,
      status: 0,
      message: "Network issue contacting the payment provider. Your payment may still be processing — check its status before retrying.",
      unknownOutcome: true,
    };
  }

  const data = await readJsonSafe(response);
  if (response.ok && data?.success && data?.data) {
    const d = data.data;
    return {
      ok: true,
      collection: {
        id: typeof d.id === "string" ? d.id : undefined,
        referenceId: typeof d.referenceId === "string" ? d.referenceId : undefined,
        externalId: typeof d.externalId === "string" ? d.externalId : undefined,
        providerReference: typeof d.providerReference === "string" ? d.providerReference : undefined,
        amount: d.amount,
        currency: typeof d.currency === "string" ? d.currency : undefined,
        status: typeof d.status === "string" ? d.status : undefined,
        raw: d,
      },
    };
  }

  const unknownOutcome = isUnknownOutcomeStatus(response.status);
  let message: string;
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    message = retryAfter
      ? `Too many payment requests. Please wait ${retryAfter} seconds and try again.`
      : "Too many payment requests. Please wait a moment and try again.";
  } else if (response.status === 401) {
    message = "Payment provider rejected our credentials. Please contact support.";
  } else if (unknownOutcome) {
    message = "Payment provider gave an unclear response. Your payment may still be processing — check its status before retrying.";
  } else {
    message = errorMessage(data, "Payment request failed. Please try again.");
  }
  console.error(
    `[quicko] create payment failed (${response.status}, requestId ${requestIdOf(data)}):`,
    JSON.stringify(data)?.slice(0, 500)
  );
  return { ok: false, status: response.status, message, unknownOutcome };
}

export async function getQuickoTransaction(
  config: QuickoConfig,
  referenceId: string
): Promise<{ ok: true; collection: QuickoCollection } | { ok: false; status: number; message: string }> {
  let response: Response;
  try {
    response = await fetch(
      `${config.baseUrl}/api/colection/transaction/${encodeURIComponent(referenceId)}`,
      { headers: quickoHeaders(config) }
    );
  } catch (error) {
    console.error("[quicko] status check transport error:", error);
    return { ok: false, status: 0, message: "Could not reach the payment provider. Please try again." };
  }

  const data = await readJsonSafe(response);
  if (response.ok && data?.success && data?.data) {
    const d = data.data;
    const amount = d.amount != null ? Number(d.amount) : undefined;
    return {
      ok: true,
      collection: {
        id: typeof d.id === "string" ? d.id : undefined,
        referenceId: typeof d.referenceId === "string" ? d.referenceId : undefined,
        externalId: typeof d.externalId === "string" ? d.externalId : undefined,
        providerReference: typeof d.providerReference === "string" ? d.providerReference : undefined,
        amount: amount != null && Number.isFinite(amount) ? amount : d.amount,
        currency: typeof d.currency === "string" ? d.currency : undefined,
        status: typeof d.status === "string" ? d.status : undefined,
        raw: d,
      },
    };
  }

  // 422 = "There is not Transaction Available here": unknown to Quicko.
  // Report PENDING (not FAILED) upstream so a live prompt cannot be killed
  // by a lookup that simply hasn't propagated yet.
  if (response.status === 422) {
    return { ok: false, status: 422, message: "Payment not found at provider yet." };
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    console.warn(`[quicko] status check rate limited (requestId ${requestIdOf(data)})`);
    return {
      ok: false,
      status: 429,
      message: retryAfter
        ? `Too many status checks. Please wait ${retryAfter} seconds and try again.`
        : "Too many status checks. Please wait a moment and try again.",
    };
  }
  if (response.status >= 500 && response.status <= 599) {
    console.error(`[quicko] status check failed (${response.status}, requestId ${requestIdOf(data)})`);
  }
  const message =
    response.status === 401
      ? "Payment provider rejected our credentials. Please contact support."
      : errorMessage(data, "Could not check payment status. Please try again.");
  return { ok: false, status: response.status, message };
}
