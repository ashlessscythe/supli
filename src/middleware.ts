import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", req.nextUrl.pathname);
    return response;
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
