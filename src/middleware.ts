import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-pathname", req.nextUrl.pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

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
