import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// No fallback secret here either — if JWT_SECRET is unset, every token fails
// to verify and the middleware fails closed (redirect to login) rather than
// trusting sessions signed with a key that is published in the source.
const RAW_SECRET = process.env.JWT_SECRET;
const JWT_SECRET = RAW_SECRET ? new TextEncoder().encode(RAW_SECRET) : null;

const protectedRoutes = ["/dashboard", "/admin"];
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("igura_session")?.value;

  let payload: any = null;
  if (token && JWT_SECRET) {
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload;
    } catch {
      // Invalid token — treat as unauthenticated
    }
  }

  // Protected routes: require valid session
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Admin routes: require ADMIN or SUPER_ADMIN role
    if (pathname.startsWith("/admin")) {
      if (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // Auth routes: redirect to dashboard if already logged in
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (payload) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/register"],
};
