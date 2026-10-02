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

/**
 * Whether plan/membership surfaces are visible to end users.
 *
 * Plans, pricing, upgrades and the memberships page are fully implemented and
 * stay reachable by direct URL, but the launch does not advertise them: no nav
 * entry, no upgrade prompts, nothing in the signup flow. Setting
 * `SHOW_PLANS=true` brings the whole commercial layer back with no code change.
 * Defaults to hidden, so a missing or misspelled variable keeps the launch
 * clean rather than exposing pricing by accident.
 */
export function arePlansVisible(): boolean {
  return process.env.SHOW_PLANS?.trim().toLowerCase() === "true";
}
