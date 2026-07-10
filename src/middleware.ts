import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

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
