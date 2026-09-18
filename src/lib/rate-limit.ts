import { NextRequest, NextResponse } from "next/server";

/**
 * In-process fixed-window rate limiter.
 *
 * Deliberately dependency-free so it works on the current deploy without new
 * infrastructure. The trade-off: state is per-instance, so on a multi-instance
 * or heavily scaled-out serverless deploy the effective limit is
 * `limit x instances`. That is still a hard ceiling on a single attacker's
 * throughput per instance and closes the "unbounded login/OTP/AI spend"
 * hole. Swap `hits` for Redis/Upstash when you outgrow one instance.
 */

interface Window {
  count: number;
  resetAt: number;
}

const hits = new Map<string, Window>();

// Bound memory: drop expired windows whenever the map gets large.
const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number) {
  if (hits.size < MAX_TRACKED_KEYS) return;
  for (const [key, window] of hits) {
    if (window.resetAt <= now) hits.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = hits.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    hits.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const ok = existing.count <= limit;

  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Best-effort client identity. `x-forwarded-for` is spoofable in general, but
 * on Vercel/most proxies the left-most entry is rewritten by the edge, so it
 * is the best signal available without a session.
 */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Applies a limit and returns a 429 response when exceeded, or null to continue.
 *
 *   const limited = enforceRateLimit(request, "login", 5, 60_000);
 *   if (limited) return limited;
 */
export function enforceRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
  extraKey?: string
): NextResponse | null {
  const key = `${bucket}:${extraKey || clientIp(request)}`;
  const result = rateLimit(key, limit, windowMs);

  if (result.ok) return null;

  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

/** Common presets, so limits stay consistent across routes. */
export const LIMITS = {
  login: { limit: 8, windowMs: 5 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 4, windowMs: 60 * 60_000 },
  payment: { limit: 10, windowMs: 10 * 60_000 },
  write: { limit: 40, windowMs: 60_000 },
  search: { limit: 120, windowMs: 60_000 },
  ai: { limit: 15, windowMs: 60 * 60_000 },
} as const;
