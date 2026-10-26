import { NextResponse } from "next/server";
import { isKioskAuthenticated, getKioskSite } from "@/lib/kiosk";
import { getKioskCatalog } from "@/server/services/kiosk-catalog.service";

export async function GET() {
  if (!(await isKioskAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const site = await getKioskSite();
  if (!site) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const catalog = await getKioskCatalog(site.id);
  return NextResponse.json(catalog);
}
