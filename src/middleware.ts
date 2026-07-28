import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge-safe auth gate. Uses JWT decode only (no Prisma) so the middleware
 * bundle stays compatible with the Edge runtime.
 */
export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });

  if (!token?.sub) {
    const login = new URL("/login", req.url);
    login.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );
    return NextResponse.redirect(login);
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/supplies/:path*",
    "/api/vendors/:path*",
    "/api/requests/:path*",
    "/api/users/:path*",
    "/api/admin/:path*",
    "/api/notifications",
    "/api/notifications/:path*",
  ],
};
