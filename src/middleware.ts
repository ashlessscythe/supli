import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", req.nextUrl.pathname);
    // #region agent log
    fetch('http://127.0.0.1:7767/ingest/b54409dd-63f2-48c1-b7ec-c1ef73a5869a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2fdd80'},body:JSON.stringify({sessionId:'2fdd80',runId:'pre-fix',hypothesisId:'A',location:'middleware.ts:set-x-pathname',message:'middleware set x-pathname on RESPONSE headers only',data:{pathname:req.nextUrl.pathname,setOn:'response'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
