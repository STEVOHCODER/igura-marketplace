import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const protectedRoutes = ["/dashboard", "/admin"];
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("igura_session")?.value;

  let payload: any = null;
  if (token) {
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
