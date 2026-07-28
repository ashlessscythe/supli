import { NextResponse } from "next/server";

/**
 * Auth.js client logger POSTs here. @auth/core@0.41.x does not recognize
 * `_log` as an action, so the [...nextauth] catch-all throws UnknownAction.
 * A dedicated route swallows those requests before they hit the handler.
 */
export async function POST() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  return new NextResponse(null, { status: 204 });
}
