import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * The signing secret is required in production. It used to fall back to the
 * literal string "fallback-secret-change-in-production", which meant anyone who
 * read the source could mint an admin session against a misconfigured deploy.
 */
function resolveSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "JWT_SECRET is missing or shorter than 32 characters. Refusing to start with a guessable signing key."
      );
    }
    console.warn(
      "[auth] JWT_SECRET missing or weak — using an ephemeral development key. Sessions will not survive a restart."
    );
    return new TextEncoder().encode(randomBytes(32).toString("hex"));
  }

  // Well-known weak secrets are blocked by the 32-char minimum above.
  // To rotate to a strong key: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

  return new TextEncoder().encode(secret);
}

const JWT_SECRET = resolveSecret();

const COOKIE_NAME = "igura_session";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  /** Version of the user's credentials when this token was minted. */
  tokenVersion?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Session check that also confirms the token's `tokenVersion` still matches
 * the user's stored one. Use this on routes protecting money or PII.
 *
 * A bare `getSession` cannot know a token was revoked: bumping
 * `tokenVersion` on a password change (or an admin force-logout) invalidates
 * every token minted before it, without keeping a blacklist.
 */
export async function getSessionVerified(): Promise<JWTPayload | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tokenVersion: true },
  });
  if (!user) return null;

  if (session.tokenVersion !== user.tokenVersion) return null;
  return session;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getTokenFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Request-token check that also confirms `tokenVersion` against the DB.
 * Mirrors getSessionVerified for the `getTokenFromRequest` call sites
 * (AI, reveal-contact) that read the cookie off the request directly.
 */
export async function getTokenFromRequestVerified(
  request: NextRequest
): Promise<JWTPayload | null> {
  const session = await getTokenFromRequest(request);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { tokenVersion: true },
  });
  if (!user) return null;

  if (session.tokenVersion !== user.tokenVersion) return null;
  return session;
}

/**
 * Generates a single-use token. The caller emails/SMSes `token`; only
 * `tokenHash` is stored, so a database leak does not hand over live reset links.
 */
export function createVerificationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string compare, for secrets that are not bcrypt hashes. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Authorization checks that return errors instead of throwing.
 *
 * The throwing variants turned a missed `try/catch` into a 500 with a stack
 * trace in dev. Callers do: `const s = requireAuth(session); if (!s.ok) return
 * NextResponse.json({ error: s.error }, { status: s.status });`
 */
export function requireAuth(
  session: JWTPayload | null
): { ok: true; session: JWTPayload } | { ok: false; status: number; error: string } {
  if (!session) return { ok: false, status: 401, error: "Not authenticated" };
  return { ok: true, session };
}

export function requireAdmin(
  session: JWTPayload | null
): { ok: true; session: JWTPayload } | { ok: false; status: number; error: string } {
  const authed = requireAuth(session);
  if (!authed.ok) return authed;
  if (authed.session.role !== "ADMIN" && authed.session.role !== "SUPER_ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return authed;
}
