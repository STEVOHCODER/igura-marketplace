export type MonetizationMode = "free" | "live";

/**
 * Launches with access free while preserving the paid provider paths for the
 * later monetization switch. Unknown values fail closed to free mode.
 */
export function getMonetizationMode(): MonetizationMode {
  return process.env.MONETIZATION_MODE?.trim().toLowerCase() === "live" ? "live" : "free";
}

export function isPaymentsEnabled(): boolean {
  return getMonetizationMode() === "live";
}
